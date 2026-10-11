import 'server-only';

import {
  FEED_PAGE_SIZE,
  type FeedFollowSummary,
  type FeedPage,
  type FeedTab,
  NEW_POSTS_COUNT_CAP,
  POPULAR_WINDOW_DAYS,
} from '@/features/feed/types';
import {
  type LinkPreviewStatus,
  Prisma,
  type PrismaClient,
  type Sentiment,
  type StockType,
} from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import {
  type Cursor,
  decodeCursor,
  decodeScoreCursor,
  encodeCursor,
  encodeScoreCursor,
  getDb,
  type ScoreCursor,
} from '@/lib/db';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

import type { PostCardData } from '../types';

import { mentionIdsOf, type PostCardRow, toPostCardData } from './post-card-select';

/**
 * Akış DAL'ı (S11; v2-milestone-1 "Teknik notlar: akış ve detay").
 *
 * **Kapsam:** görüntüleyenin kendi gönderileri + takip ettiği kullanıcıların gönderileri + takip
 * ettiği hisselerden en az birini içeren gönderiler. **Gizlenenler:** silinmiş ya da moderasyonla
 * kaldırılmış (`deletedAt`, `removedByModeration`), iki yönlü engelleme, yazarı etkin olmayan
 * (askıda/silinmiş hesap) gönderiler.
 *
 * **Sorgu sayısı:** sayfa başına sabit 2 — kart verisi tek SQL (sayfa CTE'si + kart alanları,
 * sayaçlar ve görüntüleyenin beğenisi korelasyonlu alt sorgu, hisseler `json_agg`) ve sayfadaki
 * mention'ların görünen adları için tek batch. Prisma'nın iç içe `select`'i ilişki başına ayrı SQL
 * ve sayaçlar için tüm tabloyu gruplayan `LEFT JOIN` ürettiği için burada ham SQL kullanılır;
 * DTO eşlemesi yine `toPostCardData` (tek kaynak). Plan `feed.int.test.ts`'te `EXPLAIN` ile.
 *
 * Bu modül `features/posts/server` altında: kart eşlemesi buradadır ve bir feature başka
 * feature'ın `server/` katmanını import edemez (UI `features/feed`, uç `app/api/feed`).
 */

const MAX_PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Görünür gönderi: silinmemiş, yazarı etkin, iki yönlü engel yok. `p` = Post, `u` = yazar. */
const visibleFilter = (viewerId: number): Prisma.Sql => Prisma.sql`
  p."deletedAt" IS NULL
  AND p."removedByModeration" = false
  AND u."status" = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM "UserBlocks" b
    WHERE (b."blockerId" = ${viewerId} AND b."blockedId" = p."userId")
       OR (b."blockerId" = p."userId" AND b."blockedId" = ${viewerId})
  )`;

/** Akışa girebilecek gönderi: görünür + kapsamda (kendi, takip edilen kullanıcı ya da hisse). */
const feedFilter = (viewerId: number): Prisma.Sql => Prisma.sql`
  ${visibleFilter(viewerId)}
  AND (
    p."userId" = ${viewerId}
    OR p."userId" IN (
      SELECT f."followingId" FROM "UserFollowers" f WHERE f."followerId" = ${viewerId}
    )
    OR EXISTS (
      SELECT 1 FROM "_PostStocks" ps
      JOIN "StockFollowers" sf ON sf."stockId" = ps."B" AND sf."userId" = ${viewerId}
      WHERE ps."A" = p."postId"
    )
  )`;

/** "En yeni" sayfasının kimlikleri: `(createdAt, postId)` keyset, `Post_feed_cursor_idx` sırası. */
const latestPageSql = (
  viewerId: number,
  cursor: Cursor | null,
  take: number
): Prisma.Sql => Prisma.sql`
  SELECT p."postId", 0 AS "score"
  FROM "Post" p
  JOIN "User" u ON u."userId" = p."userId"
  WHERE ${feedFilter(viewerId)}
  ${cursor ? Prisma.sql`AND (p."createdAt", p."postId") < (${cursor.createdAt}, ${cursor.id})` : Prisma.empty}
  ORDER BY p."createdAt" DESC, p."postId" DESC
  LIMIT ${take}`;

/** Keşfet önerisi: kapsamdan bağımsız, görünür son gönderiler (boş akışta; sayfalamasız). */
const discoverPageSql = (viewerId: number, take: number): Prisma.Sql => Prisma.sql`
  SELECT p."postId", 0 AS "score"
  FROM "Post" p
  JOIN "User" u ON u."userId" = p."userId"
  WHERE ${visibleFilter(viewerId)}
  ORDER BY p."createdAt" DESC, p."postId" DESC
  LIMIT ${take}`;

/**
 * "Popüler" sayfasının kimlikleri. Puan `asOf` anındaki duruma göre: o ana kadarki beğeniler ve
 * o anda silinmemiş yorumlar (`asOf`'tan sonra silinen yorum hâlâ sayılır). Sonradan gelen
 * etkileşim puanı artıramaz → sayfalar arasında atlama yok. Geri çekilen beğeninin satırı
 * silindiği için puan düşebilir; düşen gönderi sonraki sayfada tekrar gelebilir, tekrar
 * istemcide ayıklanır (`flattenUnique`). Pencere `(asOf - N gün, asOf]`; `asOf`'tan sonra
 * yazılan gönderi bu listede yoktur (En yeni'de görünür).
 */
const popularPageSql = (
  viewerId: number,
  cursor: ScoreCursor | null,
  asOf: Date,
  take: number
): Prisma.Sql => Prisma.sql`
  SELECT scored."postId", scored."score"
  FROM (
    SELECT p."postId", p."createdAt",
      (
        (SELECT COUNT(*) FROM "PostLikes" l WHERE l."postId" = p."postId" AND l."likedAt" <= ${asOf})
        + 2 * (
          SELECT COUNT(*) FROM "Comment" c
          WHERE c."postId" = p."postId" AND c."createdAt" <= ${asOf}
            AND (c."deletedAt" IS NULL OR c."deletedAt" > ${asOf})
        )
      )::int AS "score"
    FROM "Post" p
    JOIN "User" u ON u."userId" = p."userId"
    WHERE ${feedFilter(viewerId)}
      AND p."createdAt" > ${new Date(asOf.getTime() - POPULAR_WINDOW_DAYS * DAY_MS)}
      AND p."createdAt" <= ${asOf}
  ) scored
  ${
    cursor
      ? Prisma.sql`WHERE (scored."score", scored."createdAt", scored."postId") < (${cursor.score}, ${cursor.createdAt}, ${cursor.id})`
      : Prisma.empty
  }
  ORDER BY scored."score" DESC, scored."createdAt" DESC, scored."postId" DESC
  LIMIT ${take}`;

type FeedRow = {
  postId: number;
  content: string;
  contentFormat: number;
  entities: unknown;
  createdAt: Date;
  sentiment: Sentiment;
  isSponsored: boolean;
  mediaUrl: string | null;
  userId: number;
  username: string;
  displayName: string;
  profilePhoto: string | null;
  lpUrl: string | null;
  lpStatus: LinkPreviewStatus | null;
  lpSiteName: string | null;
  lpTitle: string | null;
  lpDescription: string | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewerLikeId: number | null;
  stocks: { ticker: string; companyName: string; stockType: StockType }[];
  score: number;
};

/**
 * Sayfa kimliklerinden (CTE) kart satırları — tek SQL. Sayaç tanımları `postCardSelect` ile aynı
 * (yorum sayacı silinmiş yorumları saymaz).
 */
const cardRowsSql = (
  page: Prisma.Sql,
  viewerId: number,
  order: Prisma.Sql
): Prisma.Sql => Prisma.sql`
  WITH page AS (${page})
  SELECT p."postId", p."content", p."contentFormat", p."entities", p."createdAt",
    p."sentiment"::text AS "sentiment", p."isSponsored", p."mediaUrl", p."userId",
    u."username", u."displayName", u."profilePhoto",
    lp."url" AS "lpUrl", lp."status"::text AS "lpStatus", lp."siteName" AS "lpSiteName",
    lp."title" AS "lpTitle", lp."description" AS "lpDescription",
    (SELECT COUNT(*) FROM "PostLikes" l WHERE l."postId" = p."postId")::int AS "likeCount",
    (
      SELECT COUNT(*) FROM "Comment" c WHERE c."postId" = p."postId" AND c."deletedAt" IS NULL
    )::int AS "commentCount",
    (SELECT COUNT(*) FROM "Repost" r WHERE r."postId" = p."postId")::int AS "repostCount",
    (
      SELECT l."postLikeId" FROM "PostLikes" l
      WHERE l."postId" = p."postId" AND l."userId" = ${viewerId} LIMIT 1
    ) AS "viewerLikeId",
    COALESCE((
      SELECT json_agg(json_build_object(
        'ticker', s."ticker", 'companyName', s."companyName", 'stockType', s."stockType"
      ) ORDER BY s."ticker")
      FROM "_PostStocks" ps JOIN "Stock" s ON s."stockId" = ps."B"
      WHERE ps."A" = p."postId"
    ), '[]'::json) AS "stocks",
    page."score"
  FROM page
  JOIN "Post" p ON p."postId" = page."postId"
  JOIN "User" u ON u."userId" = p."userId"
  LEFT JOIN "LinkPreview" lp ON lp."id" = p."linkPreviewId"
  ORDER BY ${order}`;

const LATEST_ORDER = Prisma.sql`p."createdAt" DESC, p."postId" DESC`;
const POPULAR_ORDER = Prisma.sql`page."score" DESC, p."createdAt" DESC, p."postId" DESC`;

/** Ham satırı kartın tek eşleyicisinin (`toPostCardData`) beklediği biçime getirir. */
const toCardRow = (row: FeedRow): PostCardRow => ({
  postId: row.postId,
  content: row.content,
  contentFormat: row.contentFormat,
  entities: row.entities as PostCardRow['entities'],
  createdAt: row.createdAt,
  sentiment: row.sentiment,
  isSponsored: row.isSponsored,
  mediaUrl: row.mediaUrl,
  userId: row.userId,
  user: { username: row.username, displayName: row.displayName, profilePhoto: row.profilePhoto },
  stocks: row.stocks.map(stock => ({ stock })),
  linkPreview:
    row.lpUrl !== null && row.lpStatus !== null
      ? {
          url: row.lpUrl,
          status: row.lpStatus,
          siteName: row.lpSiteName,
          title: row.lpTitle,
          description: row.lpDescription,
        }
      : null,
  likes: row.viewerLikeId === null ? [] : [{ postLikeId: row.viewerLikeId }],
  _count: { likes: row.likeCount, comments: row.commentCount, reposts: row.repostCount },
});

const toCards = async (
  db: PrismaClient,
  rows: readonly FeedRow[],
  viewerId: number
): Promise<PostCardData[]> => {
  const mentionIds = [...new Set(rows.flatMap(row => mentionIdsOf(row.entities)))];
  const users =
    mentionIds.length === 0
      ? []
      : await db.user.findMany({
          where: { userId: { in: mentionIds }, status: 'active' },
          select: { userId: true, username: true, displayName: true },
        });
  return rows.map(row => toPostCardData(toCardRow(row), viewerId, users));
};

export type FeedPageInput = {
  tab: FeedTab;
  /** Opak imleç; yoksa ilk sayfa. */
  cursor?: string | undefined;
  limit?: number;
  /** "Popüler" ilk sayfasının anlık görüntü zamanı (test). */
  now?: Date;
};

/**
 * Bir akış sayfası (DAL'ın yetkisiz çekirdeği; görüntüleyen çağıran tarafından doğrulanmış
 * olmalı). Bozuk ya da başka sekmenin imleci → `VALIDATION` (ilk sayfaya düşmez).
 */
export const loadFeedPage = async (
  db: PrismaClient,
  viewerId: number,
  { tab, cursor, limit = FEED_PAGE_SIZE, now = new Date() }: FeedPageInput
): Promise<Result<FeedPage>> => {
  const size = Math.min(Math.max(1, Math.trunc(limit)), MAX_PAGE_SIZE);
  // Bir fazlası: sonraki sayfa var mı (ayrı COUNT sorgusu yok)
  const take = size + 1;

  if (tab === 'latest') {
    let decoded: Cursor | null = null;
    if (cursor !== undefined) {
      const parsed = decodeCursor(cursor);
      if (!parsed.ok) return parsed;
      decoded = parsed.data;
    }
    const rows = await db.$queryRaw<FeedRow[]>(
      cardRowsSql(latestPageSql(viewerId, decoded, take), viewerId, LATEST_ORDER)
    );
    const pageRows = rows.slice(0, size);
    const last = pageRows.at(-1);
    const head = pageRows[0];
    return ok({
      items: await toCards(db, pageRows, viewerId),
      nextCursor:
        rows.length > size && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.postId })
          : null,
      headCursor:
        decoded === null && head
          ? encodeCursor({ createdAt: head.createdAt, id: head.postId })
          : null,
    });
  }

  let decoded: ScoreCursor | null = null;
  if (cursor !== undefined) {
    const parsed = decodeScoreCursor(cursor);
    if (!parsed.ok) return parsed;
    decoded = parsed.data;
  }
  const asOf = decoded?.asOf ?? now;
  const rows = await db.$queryRaw<FeedRow[]>(
    cardRowsSql(popularPageSql(viewerId, decoded, asOf, take), viewerId, POPULAR_ORDER)
  );
  const pageRows = rows.slice(0, size);
  const last = pageRows.at(-1);
  return ok({
    items: await toCards(db, pageRows, viewerId),
    nextCursor:
      rows.length > size && last
        ? encodeScoreCursor({ score: last.score, createdAt: last.createdAt, id: last.postId, asOf })
        : null,
    headCursor: null,
  });
};

/**
 * `since` imlecinden (ilk sayfanın başı) daha yeni, kapsamdaki **başkalarının** gönderi sayısı
 * ("N yeni gönderi" bandı). Kendi gönderisi sayılmaz: yazar onu zaten anında görür. Üst sınırlı.
 */
export const countNewFeedPosts = async (
  db: PrismaClient,
  viewerId: number,
  since: string
): Promise<Result<{ count: number }>> => {
  const parsed = decodeCursor(since);
  if (!parsed.ok) return parsed;
  const { createdAt, id } = parsed.data;
  const rows = await db.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS "count" FROM (
      SELECT 1 FROM "Post" p
      JOIN "User" u ON u."userId" = p."userId"
      WHERE ${feedFilter(viewerId)}
        AND p."userId" <> ${viewerId}
        AND (p."createdAt", p."postId") > (${createdAt}, ${id})
      LIMIT ${NEW_POSTS_COUNT_CAP + 1}
    ) newer`;
  return ok({ count: Math.min(rows[0]?.count ?? 0, NEW_POSTS_COUNT_CAP + 1) });
};

/** Görüntüleyenin takip sayıları (boş akışta hangi boş durumun gösterileceği). */
export const loadFollowSummary = async (
  db: PrismaClient,
  viewerId: number
): Promise<FeedFollowSummary> => {
  const [users, stocks] = await Promise.all([
    db.userFollow.count({ where: { followerId: viewerId } }),
    db.stockFollow.count({ where: { userId: viewerId } }),
  ]);
  return { users, stocks };
};

export const DISCOVER_LIMIT = 10;

/**
 * Boş akış için keşfet önerisi: herkesin görünür son gönderileri (engelli/silinmiş hariç).
 * v2-milestone-1'deki "Son" akışının (`getLatestPage`) ilk sayfası; landing'deki anonim liste M2.
 */
export const loadDiscoverPosts = async (
  db: PrismaClient,
  viewerId: number,
  limit = DISCOVER_LIMIT
): Promise<PostCardData[]> => {
  const rows = await db.$queryRaw<FeedRow[]>(
    cardRowsSql(discoverPageSql(viewerId, limit), viewerId, LATEST_ORDER)
  );
  return toCards(db, rows, viewerId);
};

// --- DAL: yetki burada (coding-standards). Akış girişli kullanıcıya özeldir. ---

export const getFeedPage = async (input: FeedPageInput): Promise<Result<FeedPage>> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return fail(ErrorCode.UNAUTHENTICATED);
  return loadFeedPage(getDb(), viewer.userId, input);
};

export const getNewFeedPostCount = async (since: string): Promise<Result<{ count: number }>> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return fail(ErrorCode.UNAUTHENTICATED);
  return countNewFeedPosts(getDb(), viewer.userId, since);
};

export const getFollowSummary = async (): Promise<FeedFollowSummary> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return { users: 0, stocks: 0 };
  return loadFollowSummary(getDb(), viewer.userId);
};

export const getDiscoverPosts = async (): Promise<PostCardData[]> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return [];
  return loadDiscoverPosts(getDb(), viewer.userId);
};
