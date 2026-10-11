import 'server-only';

import { unstable_cache } from 'next/cache';

import type { PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

/**
 * Akış sağ kolonu (tasarım §7.3): gündem etiketleri ve görüntüleyenin takip ettiği hisseler.
 * Gündem nötr ve ölçütü açık ("Son 30 günde en çok kullanılan etiketler"); fiyat yok (v1).
 */

export const TRENDING_WINDOW_DAYS = 30;
export const TRENDING_LIMIT = 8;
export const FOLLOWED_STOCKS_LIMIT = 12;
/** Gündem sayımı kullanıcıdan bağımsız; 10 dk paylaşılan önbellek (istek başına `_PostTags` taranmaz). */
export const TRENDING_TAGS_CACHE_TAG = 'feed:trending-tags';
const TEN_MINUTES = 10 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrendingTag = { slug: string; name: string; count: number };
export type FollowedStock = { ticker: string; companyName: string };

/**
 * Son 30 günde en çok kullanılan etiketler (silinmiş/moderasyonla kaldırılmış gönderiler ve
 * etkin olmayan yazarlar hariç). `slug`'ı olmayan eski satırlar linklenemez → hariç.
 */
export const queryTrendingTags = async (
  db: PrismaClient,
  now: Date = new Date(),
  limit = TRENDING_LIMIT
): Promise<TrendingTag[]> => {
  const rows = await db.$queryRaw<{ slug: string; tagName: string; count: number }[]>`
    SELECT t."slug", t."tagName", COUNT(*)::int AS "count"
    FROM "_PostTags" pt
    JOIN "Post" p ON p."postId" = pt."A"
    JOIN "User" u ON u."userId" = p."userId"
    JOIN "Tag" t ON t."tagId" = pt."B"
    WHERE p."createdAt" >= ${new Date(now.getTime() - TRENDING_WINDOW_DAYS * DAY_MS)}
      AND p."deletedAt" IS NULL AND p."removedByModeration" = false
      AND u."status" = 'active'
      AND t."slug" IS NOT NULL
    GROUP BY t."tagId", t."slug", t."tagName"
    ORDER BY "count" DESC, t."slug" ASC
    LIMIT ${limit}`;
  // `tagName` ilk kullanılan biçim; eski kayıtlarda başında `#` var (görünen ad `#` ile eklenir)
  return rows.map(row => ({
    slug: row.slug,
    name: row.tagName.replace(/^#+/, '').trim() || row.slug,
    count: row.count,
  }));
};

export const loadCachedTrendingTags: () => Promise<TrendingTag[]> = unstable_cache(
  () => queryTrendingTags(getDb()),
  ['feed', 'trending-tags-30d', 'v1'],
  { revalidate: TEN_MINUTES, tags: [TRENDING_TAGS_CACHE_TAG] }
);

/** Görüntüleyenin takip ettiği hisseler (kod sırasıyla, ilk N). Kişiye özel: önbelleksiz. */
export const queryFollowedStocks = async (
  db: PrismaClient,
  viewerId: number,
  limit = FOLLOWED_STOCKS_LIMIT
): Promise<FollowedStock[]> => {
  const rows = await db.stockFollow.findMany({
    where: { userId: viewerId },
    select: { stock: { select: { ticker: true, companyName: true } } },
    orderBy: { stock: { ticker: 'asc' } },
    take: limit,
  });
  return rows.map(row => row.stock);
};

/** DAL: girişli değilse boş liste. */
export const getFollowedStocks = async (): Promise<FollowedStock[]> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return [];
  return queryFollowedStocks(getDb(), viewer.userId);
};
