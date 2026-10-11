import 'server-only';

import type {
  DefaultStocks,
  StockIndexItem,
  TagSuggestion,
  UserSuggestion,
} from '@/features/composer/types';
import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { RESERVED_USERNAMES } from '@/lib/users/reserved-usernames';

import {
  toStockIndexItem,
  toTagSuggestion,
  toUserSuggestion,
  type StockIndexRow,
  type TagSuggestionRow,
  type UserSuggestionRow,
} from './dto';
import { prefixRange } from './prefix';

/**
 * Autocomplete veri erişimi (ADR-0002 Karar 4). Önek sorguları `*_pattern_idx`
 * (text_pattern_ops) index'lerini aralık operatörleriyle (`~>=~`, `~<~`) kullanır; plan
 * `autocomplete.int.test.ts`'te EXPLAIN ile doğrulanır.
 *
 * Yetki: kullanıcı/etiket önerileri ve varsayılan hisse listesi yalnızca girişli kullanıcıya
 * açıktır; fonksiyonlar bu yüzden `viewer` ister (çağıran `requireActionUser` ile çözer).
 * Hisse indeksi herkese açık ve kullanıcıdan bağımsızdır (CDN'de paylaşılır).
 */

export type AutocompleteDb = Pick<PrismaClient, '$queryRaw' | 'stockFollow'>;
export type Viewer = { readonly userId: number };

/** Liste başına en fazla öneri (ADR-0002 Karar 4). */
export const SUGGESTION_LIMIT = 8;
/** `GET /stocks/default` en fazla kod. */
export const DEFAULT_STOCKS_LIMIT = 50;
/** Hisse indeksindeki `m`: son 7 günde anıldığı gönderi sayısı. */
export const STOCK_MENTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Etiket önerisindeki `count`: son 30 günlük kullanım. */
export const TAG_COUNT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** Boş sorgu (trend) etiketleri ve "en çok anılan" hisseler: son 24 saat. */
export const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Kısa önekte sayım yapılacak aday etiket sayısı (en son kullanılanlar). */
const TAG_CANDIDATES = 200;
/** Görünen adda kelime başı araması (index'siz tarama) bu uzunluktan itibaren. */
const DISPLAY_NAME_MIN_QUERY = 2;

const since = (now: Date, windowMs: number): Date => new Date(now.getTime() - windowMs);

// --- Hisseler ---

/** Tüm hisse indeksi, kod sırasıyla. ~600 satır; route'ta 24 saat önbelleklenir. */
export const queryStockIndex = async (
  db: AutocompleteDb,
  now: Date = new Date()
): Promise<StockIndexItem[]> => {
  const rows = await db.$queryRaw<StockIndexRow[]>`
    SELECT s."ticker", s."companyName", s."stockType"::text AS "stockType",
           COALESCE(m."mentions", 0)::int AS "mentions"
    FROM "Stock" s
    LEFT JOIN (
      SELECT ps."B" AS "stockId", COUNT(*)::int AS "mentions"
      FROM "Post" p
      JOIN "_PostStocks" ps ON ps."A" = p."postId"
      WHERE p."createdAt" >= ${since(now, STOCK_MENTION_WINDOW_MS)} AND p."deletedAt" IS NULL
      GROUP BY ps."B"
    ) m ON m."stockId" = s."stockId"
    ORDER BY s."ticker" COLLATE "C"`;
  return rows.map(toStockIndexItem);
};

/** Son 24 saatte en çok anılan hisseler (gönderi sayısı; nötr ölçüt). Kullanıcıdan bağımsız. */
export const queryMostMentionedTickers = async (
  db: AutocompleteDb,
  now: Date = new Date()
): Promise<string[]> => {
  const rows = await db.$queryRaw<{ ticker: string }[]>`
    SELECT s."ticker"
    FROM "Post" p
    JOIN "_PostStocks" ps ON ps."A" = p."postId"
    JOIN "Stock" s ON s."stockId" = ps."B"
    WHERE p."createdAt" >= ${since(now, TRENDING_WINDOW_MS)} AND p."deletedAt" IS NULL
    GROUP BY s."stockId", s."ticker"
    ORDER BY COUNT(*) DESC, s."ticker" COLLATE "C"
    LIMIT ${DEFAULT_STOCKS_LIMIT}`;
  return rows.map(row => row.ticker);
};

/**
 * Boş `$` sorgusu: takip edilen hisseler (son takip edilen önce); hiç yoksa son 24 saatte en
 * çok anılanlar. `mostMentioned` paylaşılan önbellekten gelebilir (`loadMostMentioned`).
 */
export const queryDefaultStocks = async (
  db: AutocompleteDb,
  viewer: Viewer,
  loadMostMentioned: () => Promise<string[]>
): Promise<DefaultStocks> => {
  const follows = await db.stockFollow.findMany({
    where: { userId: viewer.userId },
    select: { stock: { select: { ticker: true } } },
    orderBy: [{ followedAt: 'desc' }, { stockFollowerId: 'desc' }],
    take: DEFAULT_STOCKS_LIMIT,
  });
  if (follows.length > 0) {
    return { source: 'following', tickers: follows.map(follow => follow.stock.ticker) };
  }
  return { source: 'mostMentioned', tickers: await loadMostMentioned() };
};

// --- Kullanıcılar ---

/**
 * Öneriye girebilecek kullanıcı: aktif (askıda/silinmiş değil), onboarding'i bitmiş, rezerve
 * adlı değil, görüntüleyenin kendisi değil ve iki yönde de engelleme yok.
 */
const suggestableUser = (viewer: Viewer): Prisma.Sql => Prisma.sql`
  u."status" = 'active'
  AND u."onboardedAt" IS NOT NULL
  AND u."userId" <> ${viewer.userId}
  AND lower(u."username") <> ALL (${RESERVED_USERNAMES as readonly string[]}::text[])
  AND NOT EXISTS (
    SELECT 1 FROM "UserBlocks" b
    WHERE (b."blockerId" = ${viewer.userId} AND b."blockedId" = u."userId")
       OR (b."blockerId" = u."userId" AND b."blockedId" = ${viewer.userId})
  )`;

const isFollowedBy = (viewer: Viewer): Prisma.Sql => Prisma.sql`EXISTS (
  SELECT 1 FROM "UserFollowers" f
  WHERE f."followerId" = ${viewer.userId} AND f."followingId" = u."userId"
)`;

/**
 * `@` önerileri. Boş sorgu: takip ettiklerim (son takip edilen önce). Dolu sorgu sıralaması:
 * 0) kullanıcı adı tam eşleşme 1) takip ettiklerim önek 2) diğer önek 3) görünen ad kelime başı
 * (`fold_tag` ile ı/i, ş/s katlamalı); eşitlikte kullanıcı adı (bayt sırası).
 *
 * İki aşama: 0–2 önek aralığıyla index'ten okunur (`USING ~<~`, kısa önekte de tarama sınırlı).
 * Görünen ad araması index'sizdir (M1'de pg_trgm yok, aktif kullanıcıları tarar); bu yüzden
 * yalnızca önek sonuçları `SUGGESTION_LIMIT`'i doldurmadıysa ve sorgu 2+ karakterse ikinci sorgu
 * olarak çalışır. pg_trgm/katlanmış kolona geçiş eşiği: ADR-0002 Karar 4.
 *
 * `mediaBucket`: avatar URL'si yalnızca bu Storage bucket'ındaysa döner (`toUserSuggestion`).
 */
export const suggestUsers = async (
  db: AutocompleteDb,
  viewer: Viewer,
  query: string,
  mediaBucket: string
): Promise<UserSuggestion[]> => {
  const toDto = (row: UserSuggestionRow): UserSuggestion => toUserSuggestion(row, mediaBucket);
  if (query === '') {
    const rows = await db.$queryRaw<UserSuggestionRow[]>`
      SELECT u."username", u."displayName", u."profilePhoto", true AS "following"
      FROM "UserFollowers" fw
      JOIN "User" u ON u."userId" = fw."followingId"
      WHERE fw."followerId" = ${viewer.userId} AND ${suggestableUser(viewer)}
      ORDER BY fw."followedAt" DESC, fw."id" DESC
      LIMIT ${SUGGESTION_LIMIT}`;
    return rows.map(toDto);
  }

  const { lo, hi } = prefixRange(query);
  const prefix = Prisma.sql`lower(u."username") ~>=~ ${lo} AND lower(u."username") ~<~ ${hi}`;

  const byUsername = await db.$queryRaw<UserSuggestionRow[]>`
    WITH candidates AS (
      (SELECT u."userId", 0 AS "rank" FROM "User" u
       WHERE lower(u."username") = ${query} AND ${suggestableUser(viewer)})
      UNION ALL
      (SELECT u."userId", 1 AS "rank" FROM "UserFollowers" fw
       JOIN "User" u ON u."userId" = fw."followingId"
       WHERE fw."followerId" = ${viewer.userId} AND ${prefix} AND ${suggestableUser(viewer)}
       ORDER BY lower(u."username") USING ~<~
       LIMIT ${SUGGESTION_LIMIT})
      UNION ALL
      (SELECT u."userId", 2 AS "rank" FROM "User" u
       WHERE ${prefix} AND ${suggestableUser(viewer)}
       ORDER BY lower(u."username") USING ~<~
       LIMIT ${SUGGESTION_LIMIT})
    ),
    best AS (SELECT "userId", MIN("rank") AS "rank" FROM candidates GROUP BY "userId")
    SELECT u."username", u."displayName", u."profilePhoto", ${isFollowedBy(viewer)} AS "following"
    FROM best
    JOIN "User" u ON u."userId" = best."userId"
    ORDER BY best."rank", lower(u."username") COLLATE "C"
    LIMIT ${SUGGESTION_LIMIT}`;

  const remaining = SUGGESTION_LIMIT - byUsername.length;
  if (remaining <= 0 || [...query].length < DISPLAY_NAME_MIN_QUERY) {
    return byUsername.map(toDto);
  }

  // `NOT (prefix)`: ilk aşamadaki herkes kullanıcı adı önekiyle eşleşir, bu yüzden çakışma yok
  const byDisplayName = await db.$queryRaw<UserSuggestionRow[]>`
    SELECT u."username", u."displayName", u."profilePhoto", ${isFollowedBy(viewer)} AS "following"
    FROM "User" u
    WHERE strpos(' ' || regexp_replace(fold_tag(u."displayName"), '[[:space:]]+', ' ', 'g'), ${` ${query}`}) > 0
      AND NOT (${prefix}) AND ${suggestableUser(viewer)}
    ORDER BY lower(u."username") COLLATE "C"
    LIMIT ${remaining}`;
  return [...byUsername, ...byDisplayName].map(toDto);
};

// --- Etiketler ---

/** `[tagId, son 30 gündeki kullanım]` çiftleri; önbellek JSON'a serileştirebilsin diye dizi. */
export type TagUsageEntries = ReadonlyArray<readonly [tagId: number, count: number]>;

/**
 * Son 30 günde kullanılan her etiketin gönderi sayısı (silinmiş gönderiler hariç). Kullanıcıdan
 * ve sorgudan bağımsız: `_PostTags` taraması istek başına değil, önbellek tazelenirken
 * (`loadCachedTagUsage`, 10 dk) bir kez yapılır.
 */
export const queryTagUsage = async (
  db: AutocompleteDb,
  now: Date = new Date()
): Promise<Array<[number, number]>> => {
  const rows = await db.$queryRaw<{ tagId: number; count: number }[]>`
    SELECT pt."B" AS "tagId", COUNT(*)::int AS "count"
    FROM "_PostTags" pt
    JOIN "Post" p ON p."postId" = pt."A"
    WHERE p."createdAt" >= ${since(now, TAG_COUNT_WINDOW_MS)} AND p."deletedAt" IS NULL
    GROUP BY pt."B"`;
  return rows.map(row => [row.tagId, row.count]);
};

type TagCandidateRow = TagSuggestionRow & { readonly tagId: number; readonly updatedAt: Date };

// `COLLATE "C"` ile aynı sıra: UTF-8 bayt sırası (JS `<` UTF-16 birimiyle karşılaştırır)
const compareBytes = (a: string, b: string): number =>
  Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/**
 * `#` önerileri (dolu sorgu): slug öneki; tam eşleşme önce, sonra son 30 gündeki kullanım
 * (azalan), son kullanım (`updatedAt`) ve slug. Aday küme, önek eşleşen en son kullanılan
 * `TAG_CANDIDATES` etiketle sınırlıdır. Sayımlar `usage`'dan (paylaşılan önbellek) gelir; bu
 * sorgu `_PostTags`'e dokunmaz.
 */
export const suggestTags = async (
  db: AutocompleteDb,
  query: string,
  usage: ReadonlyMap<number, number>
): Promise<TagSuggestion[]> => {
  const { lo, hi } = prefixRange(query);
  const candidates = await db.$queryRaw<Omit<TagCandidateRow, 'count'>[]>`
    (SELECT t."tagId", t."slug", t."tagName", t."updatedAt" FROM "Tag" t
     WHERE t."slug" = ${query})
    UNION
    (SELECT t."tagId", t."slug", t."tagName", t."updatedAt" FROM "Tag" t
     WHERE t."slug"::text ~>=~ ${lo} AND t."slug"::text ~<~ ${hi}
     ORDER BY t."updatedAt" DESC
     LIMIT ${TAG_CANDIDATES})`;
  return candidates
    .map((row): TagCandidateRow => ({ ...row, count: usage.get(row.tagId) ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.slug === query) - Number(a.slug === query) ||
        b.count - a.count ||
        b.updatedAt.getTime() - a.updatedAt.getTime() ||
        compareBytes(a.slug, b.slug)
    )
    .slice(0, SUGGESTION_LIMIT)
    .map(toTagSuggestion);
};

/** Boş `#` sorgusu: son 24 saatte en çok kullanılan etiketler. Kullanıcıdan bağımsız. */
export const queryTrendingTags = async (
  db: AutocompleteDb,
  now: Date = new Date()
): Promise<TagSuggestion[]> => {
  const rows = await db.$queryRaw<TagSuggestionRow[]>`
    SELECT t."slug", t."tagName", COUNT(*)::int AS "count"
    FROM "Post" p
    JOIN "_PostTags" pt ON pt."A" = p."postId"
    JOIN "Tag" t ON t."tagId" = pt."B"
    WHERE p."createdAt" >= ${since(now, TRENDING_WINDOW_MS)} AND p."deletedAt" IS NULL
      AND t."slug" IS NOT NULL
    GROUP BY t."tagId", t."slug", t."tagName"
    ORDER BY COUNT(*) DESC, MAX(p."createdAt") DESC, t."slug" COLLATE "C"
    LIMIT ${SUGGESTION_LIMIT}`;
  return rows.map(toTagSuggestion);
};
