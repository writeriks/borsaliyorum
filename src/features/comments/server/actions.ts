'use server';

import { revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { requireWriter } from '@/lib/auth/session';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { actionWriteDeps } from '@/lib/content/action-deps';
import { ErrorCode, fail, ok, type Result, toFailure } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { createCommentSchema, deleteCommentSchema, setCommentLikeSchema } from '../schemas';

import { createCommentForUser, deleteCommentForUser, setCommentLikeForUser } from './write';

const log = logger.child({ module: 'comments.actions' });

const revalidateComments = (postId: number): void => {
  for (const tag of [CACHE_TAGS.comments(postId), CACHE_TAGS.post(postId)]) {
    try {
      revalidateTag(tag, 'max');
    } catch (error) {
      log.error('revalidateTag failed', { err: error, tag });
    }
  }
};

/** Yorum oluşturur (ADR-0002 Karar 7): Zod → `requireWriter` → servis → cache geçersizleştirme. */
export const createComment = async (input: unknown): Promise<Result<{ commentId: number }>> => {
  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await createCommentForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (!result.ok) return result;
    if (!result.data.replayed) after(() => revalidateComments(parsed.data.postId));
    return ok({ commentId: result.data.commentId });
  } catch (error) {
    return toFailure(error, log);
  }
};

/** Kendi yorumunu siler (soft delete + 5651 kaydı). Başkasınınki → `FORBIDDEN`. */
export const deleteComment = async (input: unknown): Promise<Result<null>> => {
  const parsed = deleteCommentSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await deleteCommentForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (!result.ok) return result;
    after(() => revalidateComments(result.data.postId));
    return ok(null);
  } catch (error) {
    return toFailure(error, log);
  }
};

/** Yorum beğeni durumunu ayarlar (idempotent). */
export const setCommentLike = async (input: unknown): Promise<Result<{ liked: boolean }>> => {
  const parsed = setCommentLikeSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    return await setCommentLikeForUser(parsed.data, await actionWriteDeps(writer.data, log));
  } catch (error) {
    return toFailure(error, log);
  }
};
