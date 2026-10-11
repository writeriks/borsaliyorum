import 'server-only';

import { toRichTextContent } from '@/components/rich-text/resolve';
import type { StockSummary } from '@/components/rich-text/types';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { getCurrentUser } from '@/lib/auth/session';
import { collectRenderRefs, loadMentionUsers, loadStockLookup } from '@/lib/content/render-refs';
import { visibleAuthorWhere, visiblePostWhere } from '@/lib/content/visibility';
import { getDb } from '@/lib/db';
import { type Cursor, decodeCursor, encodeCursor } from '@/lib/db/cursor';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

import type { CommentData, CommentsPage } from '../types';

/** Sayfa başına yorum (v2-milestone-1 "Detay": artan sırada 20'şer). */
export const COMMENTS_PAGE_SIZE = 20;

/**
 * Yorumu okuyan. `canModerate` yalnızca UI içindir (silme menüsü); oturumdaki rollerden gelir,
 * `deleteComment` yetkiyi DB'den yeniden kontrol eder.
 */
export type CommentViewer = { readonly userId: number; readonly canModerate: boolean } | null;

const commentSelect = (viewerId: number) =>
  ({
    commentId: true,
    postId: true,
    userId: true,
    content: true,
    contentFormat: true,
    entities: true,
    createdAt: true,
    user: { select: { username: true, displayName: true, profilePhoto: true } },
    likes: { where: { userId: viewerId }, select: { commentLikeId: true }, take: 1 },
    _count: { select: { likes: true } },
  }) as const satisfies Prisma.CommentSelect;

/** `(createdAt, commentId) > cursor` — artan sıra için keyset koşulu. */
const afterCursor = (cursor: Cursor): Prisma.CommentWhereInput => ({
  OR: [
    { createdAt: { gt: cursor.createdAt } },
    { createdAt: cursor.createdAt, commentId: { gt: cursor.id } },
  ],
});

/**
 * Bir gönderinin yorum sayfası, eskiden yeniye (konuşma sırası). Filtreler: silinmiş (soft
 * delete, moderasyon dahil) yorum yok; yazarı etkin olmayan ya da görüntüleyenle iki yönlü
 * engelli yorum yok. Sorgu sayısı sayfa boyutundan bağımsız: yorumlar (+1 satır "sonraki var mı"
 * için) + mention'lanan kullanıcılar + cashtag hisseleri (son ikisi paralel). Gönderinin kendisi
 * görünür değilse çağıran (`getCommentsPage`) bu fonksiyona hiç gelmez.
 */
export const listCommentsPage = async (
  db: PrismaClient,
  viewer: CommentViewer,
  postId: number,
  cursor: Cursor | null,
  limit = COMMENTS_PAGE_SIZE
): Promise<CommentsPage> => {
  const viewerId = viewer?.userId ?? null;
  const rows = await db.comment.findMany({
    where: {
      postId,
      deletedAt: null,
      user: visibleAuthorWhere(viewerId),
      ...(cursor ? afterCursor(cursor) : {}),
    },
    orderBy: [{ createdAt: 'asc' }, { commentId: 'asc' }],
    take: limit + 1,
    // 0 hiçbir kullanıcıya karşılık gelmez: anonimde beğeni listesi boş döner
    select: commentSelect(viewerId ?? 0),
  });
  const page = rows.slice(0, limit);
  const refs = collectRenderRefs(page);
  const [users, stocks] = await Promise.all([
    loadMentionUsers(db, refs),
    loadStockLookup(db, refs),
  ]);
  const items = page.map((row): CommentData => {
    const body = toRichTextContent(row, { users });
    // Yalnızca bu yorumun hisseleri (yanıt gövdesi sayfanın tüm hisseleriyle şişmesin)
    const pageStocks: Record<string, StockSummary> = {};
    for (const entity of body.entities) {
      const stock = entity.type === 'cashtag' ? stocks[entity.ticker] : undefined;
      if (stock) pageStocks[stock.ticker] = stock;
    }
    const data: CommentData = {
      id: row.commentId,
      postId: row.postId,
      author: {
        username: row.user.username,
        displayName: row.user.displayName,
        avatarUrl: row.user.profilePhoto,
      },
      createdAt: row.createdAt.toISOString(),
      body,
      stocks: pageStocks,
      likes: row._count.likes,
    };
    if (viewer === null) return data;
    const isOwner = row.userId === viewer.userId;
    return {
      ...data,
      viewer: { liked: row.likes.length > 0, isOwner, canDelete: isOwner || viewer.canModerate },
    };
  });
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({ createdAt: last.createdAt, id: last.commentId })
      : null;
  return { items, nextCursor };
};

/**
 * Gönderi görüntüleyene görünür mü (silinmemiş, yazarı etkin, iki yönlü engel yok)? Yorum
 * listesi yalnızca görünür gönderide okunur; aksi halde `NOT_FOUND` (hangi neden olduğu
 * söylenmez).
 */
export const isPostVisible = async (
  db: PrismaClient,
  viewerId: number | null,
  postId: number
): Promise<boolean> =>
  (await db.post.count({ where: { postId, ...visiblePostWhere(viewerId) } })) > 0;

/**
 * DAL (public; anonim de okur): imleç doğrulaması → gönderi görünürlüğü → sayfa. Bozuk imleç ilk
 * sayfaya düşmez, `VALIDATION` döner (v2-milestone-1 "Cursor").
 */
export const getCommentsPage = async (
  postId: number,
  rawCursor: string | null,
  db: PrismaClient = getDb()
): Promise<Result<CommentsPage>> => {
  let cursor: Cursor | null = null;
  if (rawCursor !== null) {
    const decoded = decodeCursor(rawCursor);
    if (!decoded.ok) return decoded;
    cursor = decoded.data;
  }
  const user = await getCurrentUser();
  const viewer: CommentViewer = user
    ? {
        userId: user.userId,
        canModerate: user.roles.includes('moderator') || user.roles.includes('admin'),
      }
    : null;
  if (!(await isPostVisible(db, viewer?.userId ?? null, postId))) {
    return fail(ErrorCode.NOT_FOUND);
  }
  return ok(await listCommentsPage(db, viewer, postId, cursor));
};
