'use server';

import { after } from 'next/server';

import { requireWriter } from '@/lib/auth/session';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { actionWriteDeps } from '@/lib/content/action-deps';
import { expireTagsNow, revalidateTagsLater } from '@/lib/content/cache';
import { getDb } from '@/lib/db';
import { ErrorCode, fail, ok, type Result, toFailure } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { createPostSchema, deletePostSchema, setPostLikeSchema } from '../schemas';

import { attachPreviewToPost } from './attach-preview';
import { createPostForUser, deletePostForUser, setPostLikeForUser } from './write';

const log = logger.child({ module: 'posts.actions' });

/**
 * Gönderi oluşturur (ADR-0002 Karar 7). Zod → `requireWriter` (oturum, onboarding, e-posta
 * doğrulaması) → servis (5651 kapısı, rate limit, içerik kuralları, idempotency, transaction) →
 * akış ve gönderi önbelleği **senkron** geçersiz (yazar yeni gönderisini hemen görür) → yanıt
 * sonrası (`after`) yalnızca önizleme çekme/bağlama; bağlanırsa kart arka planda tazelenir.
 */
export const createPost = async (input: unknown): Promise<Result<{ postId: number }>> => {
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await createPostForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (!result.ok) return result;
    const { postId, pendingPreviewUrl } = result.data;
    // Tekrar (replay) de geçersiz kılar: ilk isteğin yanıtı kaybolmuş olabilir
    expireTagsNow([CACHE_TAGS.feed, CACHE_TAGS.post(postId)], log);
    if (pendingPreviewUrl !== null) {
      after(async () => {
        const attached = await attachPreviewToPost(postId, pendingPreviewUrl, { db: getDb(), log });
        if (attached) revalidateTagsLater([CACHE_TAGS.feed, CACHE_TAGS.post(postId)], log);
      });
    }
    return ok({ postId });
  } catch (error) {
    return toFailure(error, log);
  }
};

/**
 * Gönderi siler (soft delete + 5651 kaydı): sahibi ya da moderatör/admin (K-A, rol DB'den).
 * Diğerleri `FORBIDDEN`.
 */
export const deletePost = async (input: unknown): Promise<Result<null>> => {
  const parsed = deletePostSchema.safeParse(input);
  if (!parsed.success) return fail(ErrorCode.VALIDATION);
  const writer = await requireWriter();
  if (!writer.ok) return writer;

  try {
    const result = await deletePostForUser(parsed.data, await actionWriteDeps(writer.data, log));
    if (result.ok) expireTagsNow([CACHE_TAGS.feed, CACHE_TAGS.post(parsed.data.postId)], log);
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
    if (result.ok) expireTagsNow([CACHE_TAGS.post(parsed.data.postId)], log);
    return result;
  } catch (error) {
    return toFailure(error, log);
  }
};
