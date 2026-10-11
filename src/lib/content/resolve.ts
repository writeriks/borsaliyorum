import 'server-only';

import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { ENTITY_SCHEMA_VERSION, type Entity, type StoredEntities } from '@/lib/entities';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import { normalizePreviewUrl } from '@/lib/link-preview/normalize-url';
import { previewUrlHash } from '@/lib/link-preview/url-hash';

import type { AnalyzedContent } from './rules';

/**
 * Yazma anında entity çözümü (ADR-0002 Karar 1/7): cashtag → `stockId`, hashtag → `tagId`
 * (slug üzerinden upsert), mention → `userId`. `entities` jsonb'si ile ilişkisel tablolar
 * (`_PostStocks`, `_PostTags`, `Notification`) aynı çözümden yazılır.
 */

type Db = PrismaClient | Prisma.TransactionClient;

/** Bilinmeyen cashtag gönderiyi reddeder (K5); hangi kodlar olduğu `meta.tickers`'ta. */
export const resolveStocks = async (
  db: Db,
  tickers: readonly string[]
): Promise<Result<ReadonlyMap<string, number>>> => {
  if (tickers.length === 0) return ok(new Map());
  const rows = await db.stock.findMany({
    where: { ticker: { in: [...tickers] } },
    select: { stockId: true, ticker: true },
  });
  const byTicker = new Map(rows.map(row => [row.ticker, row.stockId]));
  const unknown = tickers.filter(ticker => !byTicker.has(ticker));
  if (unknown.length > 0) return fail(ErrorCode.UNKNOWN_CASHTAG, { tickers: unknown });
  return ok(byTicker);
};

/**
 * Mention edilen etkin kullanıcılar (kullanıcı adı büyük/küçük harf duyarsız; eski hesaplarda
 * büyük harfli adlar var). Askıdaki/silinmiş/onboarding'siz kullanıcı mention olmaz (düz metin).
 * Aynı ada katlanan birden çok eski hesap varsa yalnızca birebir eşleşen seçilir; yoksa hiçbiri
 * (yanlış kişiye link verilmez).
 */
export const resolveMentions = async (
  db: Db,
  usernames: readonly string[]
): Promise<ReadonlyMap<string, number>> => {
  if (usernames.length === 0) return new Map();
  const rows = await db.user.findMany({
    where: {
      OR: usernames.map(username => ({ username: { equals: username, mode: 'insensitive' } })),
      status: 'active',
      onboardedAt: { not: null },
    },
    select: { userId: true, username: true },
  });
  const result = new Map<string, number>();
  for (const username of usernames) {
    const matches = rows.filter(row => row.username.toLowerCase() === username);
    const chosen =
      matches.length === 1 ? matches[0] : matches.find(row => row.username === username);
    if (chosen) result.set(username, chosen.userId);
  }
  return result;
};

/**
 * Etiketleri slug üzerinden upsert eder (transaction içinde çağrılır). Yeni etiketin görünen adı
 * ilk kullanılan biçimdir (`#` önekli, eski uygulamayla aynı). Var olanların `updatedAt`'i son
 * kullanım olur (autocomplete sıralaması). Eski uygulamanın slug'sız eklediği aynı adlı satır
 * varsa slug'ı ona verilir. Çözülemeyen etiket (beklenmez) haritada yer almaz → düz metin.
 */
export const upsertTags = async (
  tx: Prisma.TransactionClient,
  hashtags: AnalyzedContent['hashtags'],
  now: Date
): Promise<ReadonlyMap<string, number>> => {
  if (hashtags.length === 0) return new Map();
  const slugs = hashtags.map(tag => tag.slug);
  // Eşzamanlı ilk kullanım ya da eski satırın tagName'i: çakışma hata değil, satır zaten var
  await tx.tag.createMany({
    data: hashtags.map(tag => ({
      tagName: `#${tag.name}`,
      slug: tag.slug,
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  });
  await tx.tag.updateMany({ where: { slug: { in: slugs } }, data: { updatedAt: now } });
  let rows = await tx.tag.findMany({
    where: { slug: { in: slugs } },
    select: { tagId: true, slug: true },
  });
  const missing = hashtags.filter(tag => !rows.some(row => row.slug === tag.slug));
  if (missing.length > 0) {
    for (const tag of missing) {
      await tx.tag.updateMany({
        where: { tagName: `#${tag.name}`, slug: null },
        data: { slug: tag.slug, updatedAt: now },
      });
    }
    rows = await tx.tag.findMany({
      where: { slug: { in: slugs } },
      select: { tagId: true, slug: true },
    });
  }
  return new Map(rows.flatMap(row => (row.slug === null ? [] : [[row.slug, row.tagId] as const])));
};

export type ResolvedIds = {
  readonly stocks: ReadonlyMap<string, number>;
  readonly tags: ReadonlyMap<string, number>;
  readonly mentions: ReadonlyMap<string, number>;
};

/** `Post/Comment.entities` (yalnızca render için); çözülemeyen mention/hashtag girmez. */
export const toStoredEntities = (
  entities: AnalyzedContent['entities'],
  ids: ResolvedIds
): StoredEntities => {
  const items = entities.flatMap((entity): Entity[] => {
    switch (entity.type) {
      case 'cashtag': {
        const stockId = ids.stocks.get(entity.ticker);
        return stockId === undefined ? [] : [{ ...entity, stockId }];
      }
      case 'hashtag': {
        const tagId = ids.tags.get(entity.slug);
        return tagId === undefined
          ? []
          : [{ type: 'hashtag', start: entity.start, end: entity.end, slug: entity.slug, tagId }];
      }
      case 'mention': {
        const userId = ids.mentions.get(entity.username);
        return userId === undefined ? [] : [{ ...entity, userId }];
      }
      default:
        return [entity];
    }
  });
  return { v: ENTITY_SCHEMA_VERSION, items };
};

/**
 * Mention bildirimi alacaklar: yazarın kendisi hariç, iki yönlü engelleme hariç (seni engellemiş
 * ya da senin engellediğin kişiye bildirim gitmez), tekil.
 */
export const mentionRecipients = async (
  db: Db,
  authorId: number,
  mentionedIds: Iterable<number>
): Promise<number[]> => {
  const candidates = [...new Set(mentionedIds)].filter(id => id !== authorId);
  if (candidates.length === 0) return [];
  const blocks = await db.userBlock.findMany({
    where: {
      OR: [
        { blockerId: { in: candidates }, blockedId: authorId },
        { blockerId: authorId, blockedId: { in: candidates } },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });
  const excluded = new Set(blocks.map(b => (b.blockerId === authorId ? b.blockedId : b.blockerId)));
  return candidates.filter(id => !excluded.has(id));
};

/** URL'nin önbellekteki başarılı önizlemesinin kimliği; yoksa null (sonra `after()` ile çekilir). */
export const findReadyPreviewId = async (db: Db, url: string): Promise<number | null> => {
  const normalized = normalizePreviewUrl(url);
  if (normalized === null) return null;
  const row = await db.linkPreview.findUnique({
    where: { urlHash: previewUrlHash(normalized) },
    select: { id: true, status: true },
  });
  return row?.status === 'ok' ? row.id : null;
};
