'use server';

import { revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { requireWriter } from '@/lib/auth/session';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { actionWriteDeps } from '@/lib/content/action-deps';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, ok, type Result, toFailure } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { createPostSchema, deletePostSchema, setPostLikeSchema } from '../schemas';

import { attachPreviewToPost } from './attach-preview';
import { createPostForUser, deletePostForUser, setPostLikeForUser } from './write';

const log = logger.child({ module: 'posts.actions' });

/** Önbellek geçersizleştirme yanıtı bekletmez ve başarısızlığı yazmayı geri almaz. */
const revalidate = (tags: readonly string[]): void => {
  for (const tag of tags) {
    try {
      revalidateTag(tag, 'max');
    } catch (error) {
      log.error('revalidateTag failed', { err: error, tag });
    }
  }
};

/**
 * Gönderi oluşturur (ADR-0002 Karar 7). Zod → `requireWriter` (oturum, onboarding, e-posta
 * doğrulaması) → servis (rate limit, içerik kuralları, idempotency, transaction, 5651 kaydı) →
 * yanıt sonrası (`after`) önizleme bağlama + cache geçersizleştirme.
 */
export const createPost = async (input: unknown): Promise<Result<{ postId: number }>> => {
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await createPostForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (!result.ok) return result;
    const { postId, pendingPreviewUrl, replayed } = result.data;
    if (!replayed) {
      after(async () => {
        if (pendingPreviewUrl !== null) {
          await attachPreviewToPost(postId, pendingPreviewUrl, { db: getDb(), log });
        }
        revalidate([CACHE_TAGS.feed, CACHE_TAGS.post(postId)]);
      });
    }
    return ok({ postId });
  } catch (error) {
    return toFailure(error, log);
  }
};

/** Kendi gönderisini siler (soft delete + 5651 kaydı). Başkasınınki → `FORBIDDEN`. */
export const deletePost = async (input: unknown): Promise<Result<null>> => {
  const parsed = deletePostSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await deletePostForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (result.ok) {
      after(() => revalidate([CACHE_TAGS.feed, CACHE_TAGS.post(parsed.data.postId)]));
    }
    return result;
  } catch (error) {
    return toFailure(error, log);
  }
};

/** Beğeni durumunu ayarlar (idempotent; istemci optimistic, hata → geri alır). */
export const setPostLike = async (input: unknown): Promise<Result<{ liked: boolean }>> => {
  const parsed = setPostLikeSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await setPostLikeForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (result.ok) after(() => revalidate([CACHE_TAGS.post(parsed.data.postId)]));
    return result;
  } catch (error) {
    return toFailure(error, log);
  }
};
