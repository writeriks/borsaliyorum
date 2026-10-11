import 'server-only';

import { recordContentEvent } from '@/lib/audit/content-event';
import { consumeWriteRateLimit } from '@/lib/content/rate-limits';
import {
  mentionRecipients,
  resolveMentions,
  resolveStocks,
  toStoredEntities,
} from '@/lib/content/resolve';
import { analyzeContentForWrite } from '@/lib/content/rules';
import { isUniqueViolation, type WriteDeps } from '@/lib/content/write-deps';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';

import type { CreateCommentInput, DeleteCommentInput, SetCommentLikeInput } from '../schemas';

export type CreatedComment = { readonly commentId: number; readonly replayed: boolean };

type StoredPayload = {
  readonly commentId: number;
  readonly postId: number;
  readonly content: string;
};

/** Aynı kimlik + aynı yük (gönderi ve metin) → ilk kayıt; farklı yük → `CONFLICT`. */
const replay = (
  existing: StoredPayload,
  payload: Omit<StoredPayload, 'commentId'>
): Result<CreatedComment> =>
  existing.postId === payload.postId && existing.content === payload.content
    ? ok({ commentId: existing.commentId, replayed: true })
    : fail(ErrorCode.CONFLICT);

const findByRequestId = (deps: WriteDeps, clientRequestId: string) =>
  deps.db.comment.findUnique({
    where: { userId_clientRequestId: { userId: deps.user.userId, clientRequestId } },
    select: { commentId: true, postId: true, content: true },
  });

/**
 * Yorum oluşturma: gönderiyle aynı hat (rate limit → içerik kuralları → idempotency → hisse
 * çözümü → transaction). Yorumda cashtag geçerlidir (eski hata #6'nın tersine) ama bilinmeyen
 * kod reddedilir (K5); hashtag yorumda etikete bağlanmaz (M1'de yorum–etiket ilişkisi yok),
 * düz metin render edilir. Silinmiş/olmayan gönderiye yorum → `NOT_FOUND`.
 */
export const createCommentForUser = async (
  input: CreateCommentInput,
  deps: WriteDeps
): Promise<Result<CreatedComment>> => {
  const { db, user } = deps;
  const now = deps.now();

  const limit = await consumeWriteRateLimit(db, 'comment.create', user.userId, now);
  if (!limit.ok) return limit;

  const analyzed = analyzeContentForWrite(input.text, 'comment');
  if (!analyzed.ok) return analyzed;
  const content = analyzed.data;
  const payload = { postId: input.postId, content: content.text };

  const existing = await findByRequestId(deps, input.clientRequestId);
  if (existing) return replay(existing, payload);

  const post = await db.post.findFirst({
    where: { postId: input.postId, deletedAt: null },
    select: { postId: true },
  });
  if (post === null) return fail(ErrorCode.NOT_FOUND);

  const stocks = await resolveStocks(db, content.tickers);
  if (!stocks.ok) return stocks;
  const mentions = await resolveMentions(db, content.mentions);
  const recipients = await mentionRecipients(db, user.userId, mentions.values());
  const entities = toStoredEntities(content.entities, {
    stocks: stocks.data,
    tags: new Map(),
    mentions,
  });

  try {
    const commentId = await db.$transaction(async tx => {
      const comment = await tx.comment.create({
        data: {
          postId: input.postId,
          userId: user.userId,
          content: content.text,
          contentFormat: 2,
          entities,
          clientRequestId: input.clientRequestId,
          createdAt: now,
          updatedAt: now,
        },
        select: { commentId: true },
      });
      if (recipients.length > 0) {
        // M1: bildirim yalnızca kayıt (teslim yok); metin render'da türden üretilir.
        await tx.notification.createMany({
          data: recipients.map(recipientId => ({
            userId: recipientId,
            fromUserId: user.userId,
            type: 'MENTION' as const,
            content: '',
            postId: input.postId,
            commentId: comment.commentId,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
      const recorded = await recordContentEvent(
        tx,
        {
          actorUserId: user.userId,
          action: 'comment_create',
          entityType: 'comment',
          entityId: comment.commentId,
          meta: deps.meta,
        },
        deps.ipKey()
      );
      if (!recorded) {
        deps.log.error('comment.create event skipped: client IP unavailable', {
          requestId: deps.meta.requestId,
        });
      }
      return comment.commentId;
    });
    return ok({ commentId, replayed: false });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const winner = await findByRequestId(deps, input.clientRequestId);
      if (winner) return replay(winner, payload);
    }
    throw error;
  }
};

/** Kendi yorumunu siler: soft delete + `ContentEvent('comment.delete')`. */
export const deleteCommentForUser = async (
  input: DeleteCommentInput,
  deps: WriteDeps
): Promise<Result<{ postId: number }>> => {
  const { db, user } = deps;
  const now = deps.now();
  const limit = await consumeWriteRateLimit(db, 'delete', user.userId, now);
  if (!limit.ok) return limit;

  const deleted = await db.$transaction(async tx => {
    const updated = await tx.comment.updateMany({
      where: { commentId: input.commentId, userId: user.userId, deletedAt: null },
      data: { deletedAt: now },
    });
    if (updated.count === 0) return false;
    const recorded = await recordContentEvent(
      tx,
      {
        actorUserId: user.userId,
        action: 'comment_delete',
        entityType: 'comment',
        entityId: input.commentId,
        meta: deps.meta,
      },
      deps.ipKey()
    );
    if (!recorded) {
      deps.log.error('comment.delete event skipped: client IP unavailable', {
        requestId: deps.meta.requestId,
      });
    }
    return true;
  });

  const comment = await db.comment.findUnique({
    where: { commentId: input.commentId },
    select: { userId: true, postId: true, deletedAt: true },
  });
  if (comment === null) return fail(ErrorCode.NOT_FOUND);
  if (!deleted && comment.userId !== user.userId) {
    return fail(comment.deletedAt === null ? ErrorCode.FORBIDDEN : ErrorCode.NOT_FOUND);
  }
  return ok({ postId: comment.postId });
};

/** Yorum beğenisi (idempotent). Silinmiş yorum ya da silinmiş gönderinin yorumu → `NOT_FOUND`. */
export const setCommentLikeForUser = async (
  input: SetCommentLikeInput,
  deps: WriteDeps
): Promise<Result<{ liked: boolean }>> => {
  const { db, user } = deps;
  const now = deps.now();
  const limit = await consumeWriteRateLimit(db, 'like', user.userId, now);
  if (!limit.ok) return limit;

  const comment = await db.comment.findFirst({
    where: { commentId: input.commentId, deletedAt: null, post: { deletedAt: null } },
    select: { commentId: true },
  });
  if (comment === null) return fail(ErrorCode.NOT_FOUND);

  if (input.liked) {
    await db.commentLike.createMany({
      data: [{ userId: user.userId, commentId: input.commentId, likedAt: now }],
      skipDuplicates: true,
    });
  } else {
    await db.commentLike.deleteMany({ where: { userId: user.userId, commentId: input.commentId } });
  }
  return ok({ liked: input.liked });
};
