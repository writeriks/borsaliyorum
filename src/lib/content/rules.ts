import type { Sentiment } from '@/generated/prisma/client';
import { CONTENT_MAX_CHARS, type ContentKind } from '@/lib/content-limits';
import { countChars, normalizeContent, parseEntities, type ParsedEntity } from '@/lib/entities';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

/**
 * Gönderi/yorum yazımının saf kuralları (ADR-0002 Karar 2/7). Sunucu metni **kendisi**
 * normalize edip parse eder; istemcinin entity'lerine güvenilmez. Grafem sınırı tek kaynaktan
 * (`CONTENT_MAX_CHARS`, K11); burada sayı tekrar yazılmaz.
 */

/** Tür başına en fazla tekil entity (spam; ADR-0002 "Ek sınırlar"). */
export const MAX_ENTITIES_PER_TYPE = 10;

/**
 * Taşıma sınırı (UTF-16 code unit): grafem sınırından çok gevşek, yalnızca devasa yükü
 * normalize/parse etmeden reddetmek için. Grafem sınırı normalize edilmiş metinde ayrıca uygulanır.
 */
export const RAW_TEXT_MAX_LENGTH = 50_000;

export type AnalyzedContent = {
  /** Normalize edilmiş, saklanacak düz metin. */
  readonly text: string;
  readonly entities: readonly ParsedEntity[];
  /** Tekil, ilk görülme sırası. */
  readonly tickers: readonly string[];
  readonly hashtags: readonly { readonly slug: string; readonly name: string }[];
  readonly mentions: readonly string[];
  readonly urls: readonly string[];
};

const uniqueBy = <T>(items: readonly T[], key: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * normalize → boş mu → grafem sınırı → parse → tür başına tekil entity sınırı.
 * Sıra hata önceliğidir: `CONTENT_EMPTY` > `CONTENT_TOO_LONG` > `TOO_MANY_ENTITIES`.
 */
export const analyzeContentForWrite = (raw: string, kind: ContentKind): Result<AnalyzedContent> => {
  const text = normalizeContent(raw);
  if (text.trim() === '') return fail(ErrorCode.CONTENT_EMPTY);
  const max = CONTENT_MAX_CHARS[kind];
  if (countChars(text) > max) return fail(ErrorCode.CONTENT_TOO_LONG, { max });

  const entities = parseEntities(text);
  const tickers: string[] = [];
  const hashtags: { slug: string; name: string }[] = [];
  const mentions: string[] = [];
  const urls: string[] = [];
  for (const entity of entities) {
    if (entity.type === 'cashtag') tickers.push(entity.ticker);
    else if (entity.type === 'hashtag') hashtags.push({ slug: entity.slug, name: entity.name });
    else if (entity.type === 'mention') mentions.push(entity.username);
    else urls.push(entity.href);
  }
  const result: AnalyzedContent = {
    text,
    entities,
    tickers: uniqueBy(tickers, t => t),
    // Görünen ad ilk kullanılan biçimdir (`Tag.tagName`)
    hashtags: uniqueBy(hashtags, h => h.slug),
    mentions: uniqueBy(mentions, m => m),
    urls: uniqueBy(urls, u => u),
  };
  if (
    result.tickers.length > MAX_ENTITIES_PER_TYPE ||
    result.hashtags.length > MAX_ENTITIES_PER_TYPE ||
    result.mentions.length > MAX_ENTITIES_PER_TYPE
  ) {
    return fail(ErrorCode.TOO_MANY_ENTITIES, { max: MAX_ENTITIES_PER_TYPE });
  }
  return ok(result);
};

/** Duyarlılık yalnızca cashtag'li gönderide anlamlı; yoksa `neutral`'a zorlanır (K4, tasarım §1.5). */
export const effectiveSentiment = (
  content: Pick<AnalyzedContent, 'tickers'>,
  requested: Sentiment
): Sentiment => (content.tickers.length > 0 ? requested : 'neutral');

/**
 * Önizleme URL'si yalnızca metnin kendi URL'lerinden biri olabilir: istemci keyfi bir adresi
 * sunucuya çektiremez. `null` = kullanıcı kapattı ya da uygun URL yok.
 */
export const acceptedPreviewUrl = (
  content: Pick<AnalyzedContent, 'urls'>,
  requested: string | null | undefined
): string | null =>
  requested !== null && requested !== undefined && content.urls.includes(requested)
    ? requested
    : null;
