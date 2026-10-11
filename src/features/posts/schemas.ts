import { z } from 'zod';

import { RAW_TEXT_MAX_LENGTH } from '@/lib/content/rules';
import { MAX_URL_LENGTH } from '@/lib/entities';

import { SENTIMENTS } from './types';

/**
 * Gönderi Server Action girdileri (ADR-0002 Karar 7). Metnin grafem sınırı burada değil,
 * normalize edilmiş metinde `analyzeContentForWrite` ile (`CONTENT_MAX_CHARS`) uygulanır:
 * şema sayıyı tekrar yazmaz, aşım `CONTENT_TOO_LONG` olarak döner.
 */
export const postIdSchema = z.number().int().positive().max(2_147_483_647);

export const createPostSchema = z.strictObject({
  text: z.string().max(RAW_TEXT_MAX_LENGTH),
  sentiment: z.enum(SENTIMENTS),
  isSponsored: z.boolean(),
  /** `null`: kullanıcı önizlemeyi kapattı ya da URL yok. */
  previewUrl: z.string().max(MAX_URL_LENGTH).nullable().optional(),
  clientRequestId: z.uuid(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const deletePostSchema = z.strictObject({ postId: postIdSchema });
export type DeletePostInput = z.infer<typeof deletePostSchema>;

export const setPostLikeSchema = z.strictObject({ postId: postIdSchema, liked: z.boolean() });
export type SetPostLikeInput = z.infer<typeof setPostLikeSchema>;
