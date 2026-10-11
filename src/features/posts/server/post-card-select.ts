import 'server-only';

// Doğrudan modüller: index istemci bileşenlerini de (next-intl navigasyonu) yükler
import { type MentionUser, toRichTextContent } from '@/components/rich-text/resolve';
import type { StockSummary } from '@/components/rich-text/types';
import type { Prisma } from '@/generated/prisma/client';

import type { PostCardData, PostLinkPreview } from '../types';

/**
 * Gönderi kartının tek seçimi (S10 son gönderiler, S11 akış, S12 detay aynısını kullanır; başka
 * yerde kart için `select` yazılmaz). Sayaçlar silinmiş yorumları saymaz (soft delete).
 */
export const postCardSelect = (viewerId: number) =>
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
    _count: { select: { likes: true, comments: { where: { deletedAt: null } }, reposts: true } },
  }) as const satisfies Prisma.PostSelect;

export type PostCardRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postCardSelect> }>;

/** Kart gövdesindeki mention kimlikleri (görünen adlar tek sorguda çözülür). */
export { mentionIdsOf } from '@/lib/content/render-refs';

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
