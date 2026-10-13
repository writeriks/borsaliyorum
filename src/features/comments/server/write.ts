import 'server-only';

import { checkCanInteract } from '@/lib/content/interaction';
import { canModerate } from '@/lib/content/moderation';
import { capMentionRecipients, consumeWriteRateLimit } from '@/lib/content/rate-limits';
import {
  mentionRecipients,
  resolveMentions,
  resolveStocks,
  toStoredEntities,
} from '@/lib/content/resolve';
import { analyzeContentForWrite } from '@/lib/content/rules';
import {
  ensureAuditable,
  isUniqueViolation,
  recordWriteEvent,
  type WriteDeps,
} from '@/lib/content/write-deps';
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
 * Yorum oluşturma: gönderiyle aynı hat (5651 kapısı → rate limit → içerik kuralları →
 * idempotency → hisse çözümü → transaction). Yorumda cashtag geçerlidir (eski hata #6'nın tersine)
 * ama bilinmeyen kod reddedilir (K5); hashtag yorumda etikete bağlanmaz (M1'de yorum–etiket
 * ilişkisi yok), düz metin render edilir. Silinmiş/olmayan gönderiye yorum → `NOT_FOUND`; gönderi
 * yazarıyla iki yönlü engel ya da yazar etkin değil → `FORBIDDEN` (K-C).
 */
export const createCommentForUser = async (
  input: CreateCommentInput,
  deps: WriteDeps
): Promise<Result<CreatedComment>> => {
  const { db, user } = deps;
  const now = deps.now();

  const auditable = ensureAuditable(deps, 'comment.create');
  if (!auditable.ok) return auditable;
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
    select: { userId: true },
  });
  if (post === null) return fail(ErrorCode.NOT_FOUND);
  const allowed = await checkCanInteract(db, user.userId, [post.userId]);
  if (!allowed.ok) return allowed;

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
      const notified = await capMentionRecipients(tx, user.userId, recipients, now);
      if (notified.length > 0) {
        // M1: bildirim yalnızca kayıt (teslim yok); metin render'da türden üretilir.
        await tx.notification.createMany({
          data: notified.map(recipientId => ({
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
      await recordWriteEvent(
        tx,
        {
          actorUserId: user.userId,
          action: 'comment_create',
          entityType: 'comment',
          entityId: comment.commentId,
        },
        deps
      );
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

/**
 * Yorum silme (K-A): sahibi (`comment.delete`) ya da moderatör/admin (rol DB'den;
 * `moderation.remove` + `removedByModeration`). Soft delete; diğerleri `FORBIDDEN` (silinmişse
 * `NOT_FOUND`). Dönüş, önbellek geçersizleştirme için yorumun gönderisi.
 */
export const deleteCommentForUser = async (
  input: DeleteCommentInput,
  deps: WriteDeps
): Promise<Result<{ postId: number }>> => {
  const { db, user } = deps;
  const now = deps.now();
  const auditable = ensureAuditable(deps, 'comment.delete');
  if (!auditable.ok) return auditable;
  const limit = await consumeWriteRateLimit(db, 'delete', user.userId, now);
  if (!limit.ok) return limit;

  const comment = await db.comment.findUnique({
    where: { commentId: input.commentId },
    select: { userId: true, postId: true, deletedAt: true },
  });
  if (comment === null) return fail(ErrorCode.NOT_FOUND);
  const isOwner = comment.userId === user.userId;
  if (!isOwner && !(await canModerate(db, user.userId))) {
    return fail(comment.deletedAt === null ? ErrorCode.FORBIDDEN : ErrorCode.NOT_FOUND);
  }
  if (comment.deletedAt !== null) return ok({ postId: comment.postId });

  await db.$transaction(async tx => {
    const updated = await tx.comment.updateMany({
      where: { commentId: input.commentId, deletedAt: null },
      data: { deletedAt: now, removedByModeration: !isOwner },
    });
    if (updated.count === 0) return;
    await recordWriteEvent(
      tx,
      {
        actorUserId: user.userId,
        action: isOwner ? 'comment_delete' : 'moderation_remove',
        entityType: 'comment',
        entityId: input.commentId,
      },
      deps
    );
  });
  return ok({ postId: comment.postId });
};

/**
 * Yorum beğenisi (idempotent). Silinmiş yorum ya da silinmiş gönderinin yorumu → `NOT_FOUND`.
 * Beğenmek için yorum ve gönderi yazarlarıyla iki yönlü engel olmamalı, ikisi de etkin olmalı
 * (K-C, `FORBIDDEN`); geri almak serbest. Dönüşteki `postId` önbellek geçersizleştirme içindir.
 */
export const setCommentLikeForUser = async (
  input: SetCommentLikeInput,
  deps: WriteDeps
): Promise<Result<{ liked: boolean; postId: number }>> => {
  const { db, user } = deps;
  const now = deps.now();
  const limit = await consumeWriteRateLimit(db, 'like', user.userId, now);
  if (!limit.ok) return limit;

  const comment = await db.comment.findFirst({
    where: { commentId: input.commentId, deletedAt: null, post: { deletedAt: null } },
    select: { userId: true, postId: true, post: { select: { userId: true } } },
  });
  if (comment === null) return fail(ErrorCode.NOT_FOUND);

  if (input.liked) {
    const allowed = await checkCanInteract(db, user.userId, [comment.userId, comment.post.userId]);
    if (!allowed.ok) return allowed;
    await db.commentLike.createMany({
      data: [{ userId: user.userId, commentId: input.commentId, likedAt: now }],
      skipDuplicates: true,
    });
  } else {
    await db.commentLike.deleteMany({ where: { userId: user.userId, commentId: input.commentId } });
  }
  return ok({ liked: input.liked, postId: comment.postId });
};
