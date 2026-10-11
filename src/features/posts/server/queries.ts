import 'server-only';

// Doğrudan modüller: index istemci bileşenlerini de (next-intl navigasyonu) yükler
import { type MentionUser, toRichTextContent } from '@/components/rich-text/resolve';
import type { StockSummary } from '@/components/rich-text/types';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

import type { PostCardData, PostLinkPreview } from '../types';

/**
 * Gönderi kartı okuma yardımcıları. S10 kapsamında yalnızca "son gönderilerin" listesi (akış
 * yer tutucusunda, yeni gönderinin göründüğü yer); S11 akış sorguları aynı DTO eşlemesini
 * (`toPostCardData`) kullanır. DTO dışına e-posta/uid çıkmaz.
 */

const postCardSelect = (viewerId: number) =>
  ({
    postId: true,
    content: true,
    contentFormat: true,
    entities: true,
    createdAt: true,
    sentiment: true,
    isSponsored: true,
    mediaUrl: true,
    userId: true,
    user: { select: { username: true, displayName: true, profilePhoto: true } },
    stocks: { select: { stock: { select: { ticker: true, companyName: true, stockType: true } } } },
    linkPreview: {
      select: { url: true, status: true, siteName: true, title: true, description: true },
    },
    likes: { where: { userId: viewerId }, select: { postLikeId: true }, take: 1 },
    _count: { select: { likes: true, comments: true, reposts: true } },
  }) as const satisfies Prisma.PostSelect;

type PostCardRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postCardSelect> }>;

const mentionIdsOf = (entities: unknown): number[] => {
  if (typeof entities !== 'object' || entities === null || !('items' in entities)) return [];
  const { items } = entities;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item: unknown) =>
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'mention' &&
    'userId' in item &&
    typeof item.userId === 'number'
      ? [item.userId]
      : []
  );
};

const toLinkPreview = (row: PostCardRow): PostLinkPreview =>
  row.linkPreview?.status === 'ok'
    ? {
        status: 'ready',
        url: row.linkPreview.url,
        siteName: row.linkPreview.siteName,
        title: row.linkPreview.title,
        description: row.linkPreview.description,
      }
    : { status: 'none' };

export const toPostCardData = (
  row: PostCardRow,
  viewerId: number,
  users: readonly MentionUser[]
): PostCardData => {
  const stocks: Record<string, StockSummary> = {};
  for (const { stock } of row.stocks) {
    stocks[stock.ticker] = {
      ticker: stock.ticker,
      companyName: stock.companyName,
      stockType: stock.stockType,
    };
  }
  return {
    id: row.postId,
    author: {
      username: row.user.username,
      displayName: row.user.displayName,
      avatarUrl: row.user.profilePhoto,
    },
    createdAt: row.createdAt.toISOString(),
    body: toRichTextContent(
      { content: row.content, contentFormat: row.contentFormat, entities: row.entities },
      { users }
    ),
    stocks,
    sentiment: row.sentiment,
    isSponsored: row.isSponsored,
    mediaUrl: row.mediaUrl,
    linkPreview: toLinkPreview(row),
    counts: {
      likes: row._count.likes,
      comments: row._count.comments,
      reposts: row._count.reposts,
    },
    viewer: { liked: row.likes.length > 0, isOwner: row.userId === viewerId },
  };
};

/** Görüntüleyenin silinmemiş son gönderileri; sayfa başına sabit 2 sorgu (gönderiler + mention'lar). */
export const listOwnRecentPosts = async (
  db: PrismaClient,
  viewerId: number,
  limit = 20
): Promise<PostCardData[]> => {
  const rows = await db.post.findMany({
    where: { userId: viewerId, deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
    take: limit,
    select: postCardSelect(viewerId),
  });
  const mentionIds = [...new Set(rows.flatMap(row => mentionIdsOf(row.entities)))];
  const users =
    mentionIds.length === 0
      ? []
      : await db.user.findMany({
          where: { userId: { in: mentionIds }, status: 'active' },
          select: { userId: true, username: true, displayName: true },
        });
  return rows.map(row => toPostCardData(row, viewerId, users));
};

/** DAL: yetki burada (girişli değilse boş liste). */
export const getMyRecentPosts = async (): Promise<PostCardData[]> => {
  const viewer = await getCurrentUser();
  if (viewer === null) return [];
  return listOwnRecentPosts(getDb(), viewer.userId);
};
