'use server';

import { requireWriter } from '@/lib/auth/session';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { actionWriteDeps } from '@/lib/content/action-deps';
import { expireTagsNow } from '@/lib/content/cache';
import { ErrorCode, fail, ok, type Result, toFailure } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { createCommentSchema, deleteCommentSchema, setCommentLikeSchema } from '../schemas';

import { createCommentForUser, deleteCommentForUser, setCommentLikeForUser } from './write';

const log = logger.child({ module: 'comments.actions' });

/**
 * Yorum listesi ve gönderi kartı (yorum sayacı) önbelleği; action içinde senkron (yazar kendi
 * yorumunu/beğenisini hemen görür, `lib/content/cache`).
 */
const expireComments = (postId: number): void =>
  expireTagsNow([CACHE_TAGS.comments(postId), CACHE_TAGS.post(postId)], log);

/** Yorum oluşturur (ADR-0002 Karar 7): Zod → `requireWriter` → servis → cache geçersizleştirme. */
export const createComment = async (input: unknown): Promise<Result<{ commentId: number }>> => {
  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await createCommentForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (!result.ok) return result;
    expireComments(parsed.data.postId);
    return ok({ commentId: result.data.commentId });
  } catch (error) {
    return toFailure(error, log);
  }
};

/**
 * Yorum siler (soft delete + 5651 kaydı): sahibi ya da moderatör/admin (K-A). Diğerleri
 * `FORBIDDEN`.
 */
export const deleteComment = async (input: unknown): Promise<Result<null>> => {
  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await deleteCommentForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (!result.ok) return result;
    expireComments(result.data.postId);
    return ok(null);
  } catch (error) {
    return toFailure(error, log);
  }
};

/** Yorum beğeni durumunu ayarlar (idempotent); gönderi beğenisiyle aynı geçersizleştirme. */
export const setCommentLike = async (input: unknown): Promise<Result<{ liked: boolean }>> => {
  const parsed = setCommentLikeSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await setCommentLikeForUser(
      parsed.data,
      await actionWriteDeps(writer.data, log)
    );
    if (!result.ok) return result;
    expireComments(result.data.postId);
    return ok({ liked: result.data.liked });
  } catch (error) {
    return toFailure(error, log);
  }
};
