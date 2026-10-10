import { Parser } from 'htmlparser2';

/**
 * Önizleme kartı için HTML `<head>`'den yalnızca başlık, açıklama ve site adı çıkarır
 * (ADR-0002 Karar 6; legal "Hukuki değerlendirme 4"). Sayfa gövdesinden metin alınmaz,
 * görsel okunmaz (K6). Çıktı düz metindir: entity'ler çözülür, kontrol/bidi karakterleri
 * temizlenir, uzunluk kırpılır. Render'da yine escape edilir.
 */

/** DB sütun sınırları (`LinkPreview.title/description/siteName`) ile aynı. */
export const PREVIEW_TEXT_LIMITS = { title: 120, description: 200, siteName: 100 } as const;

export type PreviewMeta = {
  readonly title: string | null;
  readonly description: string | null;
  readonly siteName: string | null;
};

// Değerlendirilen meta anahtarları; ilk görülen değer geçerlidir.
const META_KEYS = new Set([
  'og:title',
  'og:description',
  'og:site_name',
  'twitter:title',
  'twitter:description',
  'description',
]);
// <title> metni için ham üst sınır (kırpmadan önce); kötü niyetli dev başlıklar bellek tüketmesin.
const MAX_RAW_TEXT = 4_096;
// Charset tespiti için yalnızca baştaki baytlara bakılır (HTML spec: 1024).
const SNIFF_BYTES = 1_024;

// C0 (TAB/LF/CR hariç tümü), DEL, C1 kontrol karakterleri.
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Bidi yön/izolasyon kontrolleri ve görünmez karakterler (Trojan Source / sahte host gösterimi).
// ZWJ (U+200D) emoji dizilerinde gerektiği için korunur.
const INVISIBLE_RE =
  /[\u061C\u200B\u200C\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const WHITESPACE_RE = /[\s\u2028\u2029]+/g;

const graphemes = new Intl.Segmenter('tr', { granularity: 'grapheme' });

/**
 * Metni düz, tek satırlık ve en fazla `limit` kod noktası olacak şekilde temizler. Kırpma
 * grafem sınırında yapılır (emoji/birleşik harf bölünmez) ve sona `…` eklenir. Boş → null.
 */
export const cleanPreviewText = (value: string | undefined, limit: number): string | null => {
  if (value === undefined) return null;
  const cleaned = value
    .normalize('NFC')
    .replace(CONTROL_RE, '')
    .replace(INVISIBLE_RE, '')
    .replace(WHITESPACE_RE, ' ')
    .trim();
  if (cleaned === '') return null;
  // Postgres VARCHAR(n) kod noktası sayar; JS `length` UTF-16 birimi sayar.
  const codePoints = (s: string): number => [...s].length;
  if (codePoints(cleaned) <= limit) return cleaned;

  let out = '';
  let used = 0;
  for (const { segment } of graphemes.segment(cleaned)) {
    const size = codePoints(segment);
    if (used + size > limit - 1) break;
    out += segment;
    used += size;
  }
  return `${out.trimEnd()}…`;
};

const sniffCharset = (prefix: Uint8Array): string | null => {
  // latin1 her baytı tek karaktere çevirir; ASCII etiket aramak için yeterli.
  const head = new TextDecoder('latin1').decode(prefix);
  const match = /<meta[^>]+charset\s*=\s*["']?\s*([a-z0-9_:.-]+)/i.exec(head);
  return match?.[1]?.toLowerCase() ?? null;
};

const createDecoder = (label: string | null): TextDecoder => {
  if (label !== null) {
    try {
      return new TextDecoder(label);
    } catch {
      // Bilinmeyen charset etiketi uzak sayfanın hatası; UTF-8 ile devam edilir.
    }
  }
  return new TextDecoder('utf-8');
};

type Collected = {
  meta: Map<string, string>;
  titleText: string;
  titleSeen: boolean;
  inTitle: boolean;
  done: boolean;
};

const createParser = (state: Collected): Parser =>
  new Parser(
    {
      onopentag(name, attribs) {
        if (state.done) return;
        if (name === 'body') {
          state.done = true;
        } else if (name === 'title' && !state.titleSeen) {
          state.inTitle = true;
        } else if (name === 'meta') {
          const key = (attribs.property ?? attribs.name ?? '').trim().toLowerCase();
          const content = attribs.content;
          if (META_KEYS.has(key) && content !== undefined && !state.meta.has(key)) {
            state.meta.set(key, content.slice(0, MAX_RAW_TEXT));
          }
        }
      },
      ontext(text) {
        if (state.inTitle && state.titleText.length < MAX_RAW_TEXT) {
          state.titleText = (state.titleText + text).slice(0, MAX_RAW_TEXT);
        }
      },
      onclosetag(name) {
        if (name === 'title' && state.inTitle) {
          state.inTitle = false;
          state.titleSeen = true;
        } else if (name === 'head') {
          state.done = true;
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true }
  );

const toMeta = (state: Collected): PreviewMeta => {
  const pick = (...keys: string[]): string | undefined =>
    keys.map(key => state.meta.get(key)).find(value => value !== undefined && value.trim() !== '');
  const titleTag = state.titleSeen || state.inTitle ? state.titleText : undefined;
  return {
    title: cleanPreviewText(
      pick('og:title', 'twitter:title') ?? titleTag,
      PREVIEW_TEXT_LIMITS.title
    ),
    description: cleanPreviewText(
      pick('og:description', 'twitter:description', 'description'),
      PREVIEW_TEXT_LIMITS.description
    ),
    siteName: cleanPreviewText(pick('og:site_name'), PREVIEW_TEXT_LIMITS.siteName),
  };
};

/**
 * HTML akışını okur; `</head>` ya da `<body>` görülünce durur (kalan gövde indirilmez).
 * `charset`: `Content-Type` başlığındaki değer; yoksa ilk 1024 bayttaki `<meta charset>`.
 */
export const extractPreviewMeta = async (
  chunks: AsyncIterable<Uint8Array>,
  charset: string | null
): Promise<PreviewMeta> => {
  const state: Collected = {
    meta: new Map(),
    titleText: '',
    titleSeen: false,
    inTitle: false,
    done: false,
  };
  const parser = createParser(state);
  let decoder: TextDecoder | null = charset === null ? null : createDecoder(charset);
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;

  const flushPending = (): void => {
    decoder ??= createDecoder(sniffCharset(Buffer.concat(pending)));
    for (const part of pending) parser.write(decoder.decode(part, { stream: true }));
    pending.length = 0;
  };

  for await (const chunk of chunks) {
    if (decoder === null) {
      pending.push(chunk);
      pendingBytes += chunk.byteLength;
      if (pendingBytes < SNIFF_BYTES) continue;
      flushPending();
    } else {
      parser.write(decoder.decode(chunk, { stream: true }));
    }
    if (state.done) break;
  }
  if (pending.length > 0) flushPending();
  if (!state.done && decoder !== null) parser.write(decoder.decode());
  parser.end();
  return toMeta(state);
};

/** Tam HTML metninden çıkarım (testler ve önceden okunmuş gövde için). */
export const extractPreviewMetaFromHtml = (html: string): Promise<PreviewMeta> =>
  extractPreviewMeta(
    (async function* () {
      yield new TextEncoder().encode(html);
    })(),
    'utf-8'
  );
