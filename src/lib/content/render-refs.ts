import 'server-only';

import type { MentionUser, RichTextSource } from '@/components/rich-text/resolve';
import type { StockSummary } from '@/components/rich-text/types';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { fromLegacyMarkup } from '@/lib/entities';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Bir sayfadaki gönderi/yorum gövdelerinin render için ihtiyaç duyduğu dış kayıtlar: mention'lanan
 * kullanıcılar (v2: `userId`, eski format: kullanıcı adı) ve cashtag'lerin hisse kodları. Sayfa
 * başına **tek** kullanıcı ve **tek** hisse sorgusu yapılsın diye önce tüm satırlardan toplanır
 * (N+1 yok). Saklanan `entities` jsonb'sine güvenilmez: tip uymayan öğe sessizce atlanır, asıl
 * doğrulama render'da (`toRichTextContent`).
 */
export type RenderRefs = {
  readonly userIds: ReadonlySet<number>;
  readonly usernames: ReadonlySet<string>;
  readonly tickers: ReadonlySet<string>;
};

const storedItemsOf = (entities: unknown): unknown[] => {
  if (typeof entities !== 'object' || entities === null || !('items' in entities)) return [];
  return Array.isArray(entities.items) ? entities.items : [];
};

/** v2 (`contentFormat=2`) gövdedeki mention kimlikleri. */
export const mentionIdsOf = (entities: unknown): number[] =>
  storedItemsOf(entities).flatMap((item: unknown) =>
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'mention' &&
    'userId' in item &&
    typeof item.userId === 'number'
      ? [item.userId]
      : []
  );

const storedTickersOf = (entities: unknown): string[] =>
  storedItemsOf(entities).flatMap((item: unknown) =>
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'cashtag' &&
    'ticker' in item &&
    typeof item.ticker === 'string'
      ? [item.ticker]
      : []
  );

export const collectRenderRefs = (sources: readonly RichTextSource[]): RenderRefs => {
  const userIds = new Set<number>();
  const usernames = new Set<string>();
  const tickers = new Set<string>();
  for (const source of sources) {
    if (source.contentFormat === 1) {
      for (const entity of fromLegacyMarkup(source.content).entities) {
        if (entity.type === 'mention') usernames.add(entity.username);
        if (entity.type === 'cashtag') tickers.add(entity.ticker);
      }
      continue;
    }
    for (const id of mentionIdsOf(source.entities)) userIds.add(id);
    for (const ticker of storedTickersOf(source.entities)) tickers.add(ticker);
  }
  return { userIds, usernames, tickers };
};

/**
 * Mention'lanan **etkin** kullanıcılar (tek sorgu). Silinmiş/askıdaki kullanıcı listede olmaz →
 * mention düz metin render edilir ([ENT-R07]). Eski format kullanıcı adları küçük harfe
 * katlanmış gelir; DB'deki eski adlar büyük harf içerebildiği için karşılaştırma harf duyarsız.
 */
export const loadMentionUsers = async (db: Db, refs: RenderRefs): Promise<MentionUser[]> => {
  const or: Prisma.UserWhereInput[] = [];
  if (refs.userIds.size > 0) or.push({ userId: { in: [...refs.userIds] } });
  if (refs.usernames.size > 0) {
    or.push({ username: { in: [...refs.usernames], mode: 'insensitive' } });
  }
  if (or.length === 0) return [];
  return db.user.findMany({
    where: { status: 'active', OR: or },
    select: { userId: true, username: true, displayName: true },
  });
};

/** Cashtag'lerin hisse özeti (tek sorgu). İndekste olmayan kod düz metin kalır. */
export const loadStockLookup = async (
  db: Db,
  refs: RenderRefs
): Promise<Record<string, StockSummary>> => {
  if (refs.tickers.size === 0) return {};
  const rows = await db.stock.findMany({
    where: { ticker: { in: [...refs.tickers] } },
    select: { ticker: true, companyName: true, stockType: true },
  });
  const lookup: Record<string, StockSummary> = {};
  for (const row of rows) lookup[row.ticker] = row;
  return lookup;
};
