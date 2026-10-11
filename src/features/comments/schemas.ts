import { z } from 'zod';

import { RAW_TEXT_MAX_LENGTH } from '@/lib/content/rules';

/**
 * Yorum Server Action girdileri (ADR-0002 Karar 7). Grafem sınırı (500, K11) normalize edilmiş
 * metinde `analyzeContentForWrite` ile uygulanır; aşım `CONTENT_TOO_LONG`.
 */
const idSchema = z.number().int().positive().max(2_147_483_647);

export const createCommentSchema = z.strictObject({
  postId: idSchema,
  text: z.string().max(RAW_TEXT_MAX_LENGTH),
  clientRequestId: z.uuid(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const deleteCommentSchema = z.strictObject({ commentId: idSchema });
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

export const setCommentLikeSchema = z.strictObject({ commentId: idSchema, liked: z.boolean() });
export type SetCommentLikeInput = z.infer<typeof setCommentLikeSchema>;
