import { hasUrlLeftBoundary } from './boundaries';

export const MAX_URL_LENGTH = 2048;

// URL adayı: şema ya da `www.` ile başlar; boşluk, `<>"` ve apostrof (`www.borsa.com'da`) bitirir.
const URL_CANDIDATE_RE = /(?:https?:\/\/|www\.)[^\s<>"'’]*/giu;
const TRAILING_PUNCT = new Set(['.', ',', ':', ';', '!', '?', '"', '”']);
// `URL.hostname` punycode'a çevrilmiş ve küçük harflidir; etiketler LDH olmalı. `www.$THYAO`
// gibi WHATWG'nin kabul ettiği ama alan adı olamayacak host'lar link sayılmaz.
const HOST_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type UrlCandidate = {
  /** Aday metnin tamamı; içine düşen tetikleyiciler (geçerli olsun olmasın) entity olmaz. */
  rawStart: number;
  rawEnd: number;
  /**
   * Geçerliyse URL entity'si; değilse (sol sınır yok, kullanıcı bilgisi, `localhost`, çok
   * uzun …) null. `href` kanonik WHATWG biçimidir (punycode host, `\` → `/`); görünen metin
   * `start`/`end` aralığıdır.
   */
  url: { start: number; end: number; href: string } | null;
};

const countChar = (s: string, ch: string): number => s.split(ch).length - 1;

/** Sondaki noktalama ve dengesiz `)` URL'ye dahil değildir: `(bkz. https://kap.org.tr/x).` */
const trimTrailing = (candidate: string): string => {
  let end = candidate.length;
  const open = countChar(candidate, '(');
  let close = countChar(candidate, ')');
  for (;;) {
    const last = candidate.charAt(end - 1);
    if (TRAILING_PUNCT.has(last)) {
      end -= 1;
    } else if (last === ')' && close > open) {
      end -= 1;
      close -= 1;
    } else {
      return candidate.slice(0, end);
    }
  }
};

/** Kabul edilebilir URL'nin kanonik `href`'i; değilse null. */
const toCanonicalHref = (text: string): string | null => {
  let url: URL;
  try {
    url = new URL(/^www\./i.test(text) ? `https://${text}` : text);
  } catch {
    // Geçersiz URL beklenen bir kullanıcı girdisi; entity üretilmez, loglanacak bir hata değil.
    return null;
  }
  if (url.username !== '' || url.password !== '') return null;
  // `localhost` gibi noktasız, `a..b` gibi boş etiketli ve LDH dışı host'lar link sayılmaz.
  const labels = url.hostname.replace(/\.$/, '').split('.');
  if (labels.length < 2 || !labels.every(label => HOST_LABEL_RE.test(label))) return null;
  // Kanonik biçim (punycode, yüzde kodlama) uzayabilir; saklanan href de sınırı aşmamalı.
  return url.href.length <= MAX_URL_LENGTH ? url.href : null;
};

export const findUrlCandidates = (text: string): UrlCandidate[] => {
  const result: UrlCandidate[] = [];
  for (const match of text.matchAll(URL_CANDIDATE_RE)) {
    const rawStart = match.index;
    const raw = match[0];
    const rawEnd = rawStart + raw.length;
    // Sol sınırı olmayan aday (`x=https://x.com/@ali`) link değildir ama aralığı yine de
    // engellenir; aksi halde içindeki `@ali` mention olur.
    if (!hasUrlLeftBoundary(text, rawStart)) {
      result.push({ rawStart, rawEnd, url: null });
      continue;
    }
    const trimmed = trimTrailing(raw);
    const href = trimmed.length <= MAX_URL_LENGTH ? toCanonicalHref(trimmed) : null;
    result.push({
      rawStart,
      rawEnd,
      url: href === null ? null : { start: rawStart, end: rawStart + trimmed.length, href },
    });
  }
  return result;
};
