import { hasLeftBoundary, hasRightBoundary, matchAt } from './boundaries';
import { foldTag, toTicker } from './fold';
import type { ParsedEntity } from './types';
import { findUrlCandidates } from './url';

export const MAX_HASHTAG_LENGTH = 50;

const CASHTAG_BODY_RE = /[A-Za-z0-9]+/y;
const HASHTAG_BODY_RE = /[\p{L}\p{N}\p{M}_]+/uy;
const MENTION_BODY_RE = /[A-Za-z0-9_]+/y;
const LETTER_RE = /\p{L}/u;
const LETTER_AT_RE = /\p{L}/uy;

type Range = { start: number; end: number };
type TriggerParser = (text: string, start: number) => ParsedEntity | null;

const parseCashtag: TriggerParser = (text, start) => {
  const body = matchAt(CASHTAG_BODY_RE, text, start + 1);
  const end = start + 1 + body.length;
  // İlk karakter harf: `$100`, `$5K` hisse değil. 2-8 karakter; daha uzun koşu hiç entity değil.
  if (body.length < 2 || body.length > 8 || !/^[A-Za-z]/.test(body)) return null;
  if (!hasRightBoundary(text, end)) return null;
  return { type: 'cashtag', start, end, ticker: toTicker(body) };
};

const parseHashtag: TriggerParser = (text, start) => {
  const body = matchAt(HASHTAG_BODY_RE, text, start + 1);
  // Uzunluk code point cinsinden (regex niceleyicisiyle aynı); 50'yi aşan etiket hiç entity değil.
  if (body === '' || [...body].length > MAX_HASHTAG_LENGTH || !LETTER_RE.test(body)) return null;
  const end = start + 1 + body.length;
  return { type: 'hashtag', start, end, slug: foldTag(body), name: body };
};

const parseMention: TriggerParser = (text, start) => {
  const body = matchAt(MENTION_BODY_RE, text, start + 1);
  const end = start + 1 + body.length;
  if (body.length < 3 || body.length > 20 || !hasRightBoundary(text, end)) return null;
  // E-posta parçaları (`@a.b`, `@ali@x`) mention değil.
  const next = text.charAt(end);
  if (next === '@') return null;
  if (next === '.') {
    LETTER_AT_RE.lastIndex = end + 1;
    if (LETTER_AT_RE.test(text)) return null;
  }
  return { type: 'mention', start, end, username: body.toLowerCase() };
};

const TRIGGER_PARSERS: ReadonlyMap<string, TriggerParser> = new Map([
  ['$', parseCashtag],
  ['#', parseHashtag],
  ['@', parseMention],
]);

/**
 * Metindeki cashtag/hashtag/mention/URL entity'leri; çözümsüz (id'siz), `start`'a göre sıralı,
 * çakışmasız. Hiçbir girdide throw etmez. Önce URL'ler bulunur ve aralıkları "dolu" sayılır;
 * URL içindeki `#`, `$`, `@` entity olmaz (ADR-0002 Karar 2).
 */
export const parseEntities = (text: string): ParsedEntity[] => {
  const candidates = findUrlCandidates(text);
  const blocked: Range[] = candidates.map(c => ({ start: c.rawStart, end: c.rawEnd }));
  const urls: ParsedEntity[] = [];
  for (const candidate of candidates) {
    if (candidate.url) urls.push({ type: 'url', ...candidate.url });
  }

  const triggers: ParsedEntity[] = [];
  // Aday aralıkları sıralı ve ayrık; metinle birlikte tek geçişte ilerlenir.
  const pending = blocked.values();
  let block = pending.next().value;
  let i = 0;
  while (i < text.length) {
    if (block && block.start <= i) {
      i = block.end;
      block = pending.next().value;
      continue;
    }
    const parser = TRIGGER_PARSERS.get(text.charAt(i));
    const entity = parser && hasLeftBoundary(text, i) ? parser(text, i) : null;
    // Bir entity bir sonraki URL adayına taşamaz: aday her zaman bir sınırda başlar,
    // gövdeler ise sınır karakteri içermez.
    if (entity) {
      triggers.push(entity);
      i = entity.end;
    } else {
      i += 1;
    }
  }

  return [...urls, ...triggers].sort((a, b) => a.start - b.start);
};

/** Composer'ın önizleme isteyeceği ilk URL (`href`), yoksa null. */
export const firstPreviewableUrl = (entities: readonly ParsedEntity[]): string | null => {
  for (const entity of entities) {
    if (entity.type === 'url') return entity.href;
  }
  return null;
};
