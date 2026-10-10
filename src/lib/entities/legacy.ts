import { toTicker } from './fold';
import { toHashtagSlug } from './hashtag';
import { normalizeContent } from './normalize';
import { parseEntities } from './parse';
import type { ParsedEntity } from './types';

// Eski react-mentions markup'ı: `$(THYAO)`, `#(bist100)`, `@(ali)` (legacy content-input,
// `markup='$(__id__)'`). İçerik eski editörün id'sidir; gramer kurallarından geçmemiş olabilir.
const LEGACY_MARKUP_RE = /([$#@])\(([^()\n]+)\)/g;
const LEGACY_TICKER_RE = /^[A-Za-z][A-Za-z0-9]{1,7}$/;
const LEGACY_USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

/**
 * E-posta id'si çözülemeyen mention'ın yerine yazılır: e-posta metinde görünmez (KVKK).
 * `ı` ASCII olmadığından parser bunu mention saymaz. Kullanıcı içeriğinin parçası olduğu için
 * i18n'den gelmez.
 */
export const LEGACY_MENTION_PLACEHOLDER = '@kullanıcı';

export type LegacyMarkupOptions = {
  /**
   * `@(ali@x.com)` gibi e-posta id'li eski mention'lar için güncel kullanıcı adı (çağıran
   * sayfa başına tek sorguyla önceden çözer). null → yer tutucu yazılır, mention üretilmez.
   */
  resolveMention?: (id: string) => string | null;
};

export type LegacyConversion = { text: string; entities: ParsedEntity[] };

type Converted = { text: string; entity: ParsedEntity | null };

const convertMention = (id: string, start: number, options: LegacyMarkupOptions): Converted => {
  const username = id.includes('@') ? (options.resolveMention?.(id) ?? null) : id;
  if (username === null) return { text: LEGACY_MENTION_PLACEHOLDER, entity: null };
  const text = `@${username}`;
  if (!LEGACY_USERNAME_RE.test(username)) {
    // Çözülmüş ad beklenmedik biçimdeyse de e-posta yazılmaz.
    return { text: id.includes('@') ? LEGACY_MENTION_PLACEHOLDER : text, entity: null };
  }
  const end = start + text.length;
  return { text, entity: { type: 'mention', start, end, username: username.toLowerCase() } };
};

const convert = (
  trigger: string,
  id: string,
  start: number,
  options: LegacyMarkupOptions
): Converted => {
  if (trigger === '@') return convertMention(id, start, options);
  const text = `${trigger}${id}`;
  const end = start + text.length;
  if (trigger === '$') {
    if (!LEGACY_TICKER_RE.test(id)) return { text, entity: null };
    return { text, entity: { type: 'cashtag', start, end, ticker: toTicker(id) } };
  }
  // Eski etiketler `.` gibi bugünkü gövdede olmayan karakterler içerebilir (`#(borsa.istanbul)`);
  // markup sınırı belli olduğu için bütün olarak korunur.
  const slug = toHashtagSlug(id);
  if (slug === null) return { text, entity: null };
  return { text, entity: { type: 'hashtag', start, end, slug, name: id } };
};

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }): boolean =>
  a.start < b.end && b.start < a.end;

/**
 * `contentFormat=1` metnini düz metne ve entity listesine çevirir (ADR-0002 Karar 1). Girdi önce
 * `normalizeContent`'ten geçer; dönen metin ayrıca normalize edilmemelidir (offset'ler kayar).
 * Markup entity'leri doğrudan markup sınırlarından üretilir (`$(THYAO)$(ASELS)` iki cashtag);
 * markup dışındaki düz metin (URL'ler vb.) aynı parser'dan geçer, markup ile çakışan sonuç atılır.
 */
export const fromLegacyMarkup = (
  legacy: string,
  options: LegacyMarkupOptions = {}
): LegacyConversion => {
  const source = normalizeContent(legacy);
  const markupSpans: Array<{ start: number; end: number }> = [];
  const markupEntities: ParsedEntity[] = [];
  let text = '';
  let cursor = 0;
  for (const match of source.matchAll(LEGACY_MARKUP_RE)) {
    const [whole, trigger = '', id = ''] = match;
    text += source.slice(cursor, match.index);
    cursor = match.index + whole.length;
    const start = text.length;
    const converted = convert(trigger, id, start, options);
    text += converted.text;
    markupSpans.push({ start, end: text.length });
    if (converted.entity) markupEntities.push(converted.entity);
  }
  text += source.slice(cursor);

  const plainEntities = parseEntities(text).filter(
    entity => !markupSpans.some(span => overlaps(span, entity))
  );
  return {
    text,
    entities: [...markupEntities, ...plainEntities].sort((a, b) => a.start - b.start),
  };
};
