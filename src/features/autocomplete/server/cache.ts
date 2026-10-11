import 'server-only';

import { addCacheTag, invalidateByTag } from '@vercel/functions';
import { revalidateTag, unstable_cache } from 'next/cache';

import type { StockIndexItem, TagSuggestion } from '@/features/composer/types';
import { getDb } from '@/lib/db';

import { queryMostMentionedTickers, queryStockIndex, queryTrendingTags } from './queries';

/**
 * Kullanıcıdan bağımsız autocomplete verisinin sunucu önbelleği (Next Data Cache). Hisse
 * indeksi stock sync sonrası `POST /api/revalidate/stocks` ile tazelenir; o uç hem bu
 * önbelleği (`revalidateTag`) hem de Vercel CDN'deki yanıtı (`invalidateByTag`) geçersiz kılar.
 */
export const STOCKS_CACHE_TAG = 'stocks';

const DAY_SECONDS = 24 * 60 * 60;
const TEN_MINUTES = 10 * 60;

export const loadCachedStockIndex: () => Promise<StockIndexItem[]> = unstable_cache(
  () => queryStockIndex(getDb()),
  ['autocomplete', 'stock-index', 'v1'],
  { revalidate: DAY_SECONDS, tags: [STOCKS_CACHE_TAG] }
);

export const loadCachedMostMentioned: () => Promise<string[]> = unstable_cache(
  () => queryMostMentionedTickers(getDb()),
  ['autocomplete', 'most-mentioned', 'v1'],
  { revalidate: TEN_MINUTES }
);

export const loadCachedTrendingTags: () => Promise<TagSuggestion[]> = unstable_cache(
  () => queryTrendingTags(getDb()),
  ['autocomplete', 'trending-tags', 'v1'],
  { revalidate: TEN_MINUTES }
);

/** Hisse indeksi yanıtını Vercel CDN'de `stocks` tag'iyle işaretler (Vercel dışında etkisiz). */
export const tagStockIndexResponse = (): Promise<void> => addCacheTag(STOCKS_CACHE_TAG);

/** Stock sync sonrası: sunucu önbelleği + CDN. */
export const invalidateStockIndex = async (): Promise<void> => {
  revalidateTag(STOCKS_CACHE_TAG, { expire: 0 });
  await invalidateByTag(STOCKS_CACHE_TAG);
};
