import { toTicker } from '@/lib/entities';
import { toHashtagSlug } from '@/lib/entities/hashtag';

import type { RichTextEntity, StockLookup, StockSummary } from './types';
import { canonicalHrefOfText, shortenUrlForDisplay, toSafeExternalHref } from './url-display';

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'cashtag'; text: string; stock: StockSummary }
  | { kind: 'hashtag'; text: string; slug: string }
  | { kind: 'mention'; text: string; username: string; displayName: string }
  | { kind: 'url'; text: string; href: string; display: string };

/** Atlanan entity'nin nedeni; log'a yalnızca bu ve tür yazılır (içerik yazılmaz). */
export type SkipReason = 'offset' | 'overlap' | 'mismatch' | 'unsafe-href';
export type SkippedEntity = { index: number; type: string; reason: SkipReason };

export type SegmentResult = { segments: Segment[]; skipped: SkippedEntity[] };

const TICKER_RE = /^[A-Z][A-Z0-9]{1,7}$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/i;
// Slug URL yolunda tek segment olmalı; boşluk/kontrol karakteri olamaz (encode edilse de).
const SLUG_INVALID_RE = /[\s\p{C}/]/u;
const TRIGGER = { cashtag: '$', hashtag: '#', mention: '@' } as const;

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

const hasValidRange = (text: string, entity: RichTextEntity): boolean => {
  const { start, end } = entity;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return false;
  if (start < 0 || end > text.length || start >= end) return false;
  // Aralık bir emoji/astral karakterin ortasından başlayamaz ya da bitemez.
  return !isLowSurrogate(text.charCodeAt(start)) && !isHighSurrogate(text.charCodeAt(end - 1));
};

type Classified = Segment | { reject: SkipReason };

const classify = (slice: string, entity: RichTextEntity, stocks: StockLookup): Classified => {
  switch (entity.type) {
    case 'cashtag': {
      if (!slice.startsWith(TRIGGER.cashtag) || !TICKER_RE.test(entity.ticker)) {
        return { reject: 'mismatch' };
      }
      if (toTicker(slice.slice(1)) !== entity.ticker) return { reject: 'mismatch' };
      const stock = Object.hasOwn(stocks, entity.ticker) ? stocks[entity.ticker] : undefined;
      // Listeden çıkmış hisse: düz metin (tasarım §3.2); bozuk veri değil, log yok.
      return stock ? { kind: 'cashtag', text: slice, stock } : { kind: 'text', text: slice };
    }
    case 'hashtag': {
      const { slug } = entity;
      if (!slice.startsWith(TRIGGER.hashtag) || slug === '' || SLUG_INVALID_RE.test(slug)) {
        return { reject: 'mismatch' };
      }
      // Savunma derinliği: slug yazma anındaki kuralla (parser ve eski markup dönüştürücüsü de
      // `toHashtagSlug` kullanır) görünen gövdeden yeniden üretilir; `#..` gibi harfsiz, karışık
      // alfabeli ya da geçersiz etiket jsonb'ye sızsa bile link olmaz.
      if (toHashtagSlug(slice.slice(1)) !== slug) return { reject: 'mismatch' };
      return { kind: 'hashtag', text: slice, slug };
    }
    case 'mention': {
      if (!slice.startsWith(TRIGGER.mention) || !USERNAME_RE.test(entity.username)) {
        return { reject: 'mismatch' };
      }
      return {
        kind: 'mention',
        text: slice,
        username: entity.username,
        displayName: entity.displayName,
      };
    }
    case 'url': {
      const href = toSafeExternalHref(entity.href);
      if (href === null) return { reject: 'unsafe-href' };
      // Görünen metin başka, gidilen adres başka olamaz (`https://kap.org.tr` yazıp kötü siteye
      // giden kirli veri): metnin kanonik hâli href ile birebir aynı olmalı.
      if (canonicalHrefOfText(slice) !== href) return { reject: 'mismatch' };
      return { kind: 'url', text: slice, href, display: shortenUrlForDisplay(href) };
    }
    default:
      return { reject: 'mismatch' };
  }
};

/**
 * Metni entity sınırlarından parçalara böler. Geçersiz (aralık dışı, çakışan, metinle uyuşmayan,
 * güvensiz href'li) entity atlanır ve o bölüm düz metin kalır; fonksiyon hiçbir girdide throw
 * etmez (ADR-0002 Karar 5).
 */
export const buildSegments = (
  text: string,
  entities: readonly RichTextEntity[],
  stocks: StockLookup = {}
): SegmentResult => {
  const segments: Segment[] = [];
  const skipped: SkippedEntity[] = [];
  const ordered = entities
    .map((entity, index) => ({ entity, index }))
    .filter(({ entity, index }) => {
      if (entity !== null && typeof entity === 'object' && hasValidRange(text, entity)) return true;
      skipped.push({ index, type: String(entity?.type), reason: 'offset' });
      return false;
    })
    .sort((a, b) => a.entity.start - b.entity.start || a.index - b.index);

  let cursor = 0;
  let pending = '';
  const flush = (): void => {
    if (pending !== '') segments.push({ kind: 'text', text: pending });
    pending = '';
  };

  for (const { entity, index } of ordered) {
    if (entity.start < cursor) {
      skipped.push({ index, type: entity.type, reason: 'overlap' });
      continue;
    }
    pending += text.slice(cursor, entity.start);
    const slice = text.slice(entity.start, entity.end);
    const result = classify(slice, entity, stocks);
    if ('reject' in result) {
      skipped.push({ index, type: entity.type, reason: result.reject });
      pending += slice;
    } else if (result.kind === 'text') {
      pending += slice;
    } else {
      flush();
      segments.push(result);
    }
    cursor = entity.end;
  }
  pending += text.slice(cursor);
  flush();
  return { segments, skipped };
};
