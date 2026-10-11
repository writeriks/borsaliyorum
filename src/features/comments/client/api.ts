import { z } from 'zod';

import { STOCK_TYPES } from '@/components/rich-text/types';

import type { CommentsPage } from '../types';

/**
 * `GET /api/posts/[id]/comments` yanıtının istemci şeması (sunucu `CommentsPage` ile aynı şekil).
 * Kendi ucumuz olsa da ağdan gelen veri parse edilir: eski sekmeyle yeni sürüm arasındaki
 * uyumsuzluk sessizce bozuk render yerine hata durumuna düşer.
 */
const offset = z.number().int().nonnegative();
const entitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cashtag'), start: offset, end: offset, ticker: z.string() }),
  z.object({ type: z.literal('hashtag'), start: offset, end: offset, slug: z.string() }),
  z.object({
    type: z.literal('mention'),
    start: offset,
    end: offset,
    username: z.string(),
    displayName: z.string(),
  }),
  z.object({ type: z.literal('url'), start: offset, end: offset, href: z.string() }),
]);

const commentSchema = z.object({
  id: z.number().int().positive(),
  postId: z.number().int().positive(),
  author: z.object({
    username: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  createdAt: z.string(),
  body: z.object({ text: z.string(), entities: z.array(entitySchema) }),
  stocks: z.record(
    z.string(),
    z.object({ ticker: z.string(), companyName: z.string(), stockType: z.enum(STOCK_TYPES) })
  ),
  likes: z.number().int().nonnegative(),
  viewer: z.object({ liked: z.boolean(), isOwner: z.boolean(), canDelete: z.boolean() }).optional(),
});

const responseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ items: z.array(commentSchema), nextCursor: z.string().nullable() }),
});

export class CommentsRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`comments → ${status}`);
    this.name = 'CommentsRequestError';
    this.status = status;
  }
}

export const commentsQueryKey = (postId: number): readonly ['comments', number] => [
  'comments',
  postId,
];

/** `cursor` null → ilk sayfa (yeniden doğrulamada; ilk yüklemede sunucuda render edilir). */
export const commentsPath = (postId: number, cursor: string | null): string =>
  cursor === null
    ? `/api/posts/${postId}/comments`
    : `/api/posts/${postId}/comments?${new URLSearchParams({ cursor }).toString()}`;

/** Bir yorum sayfası ("Daha fazla yükle" ve yorum yazıldıktan sonra yeniden doğrulama). */
export const fetchCommentsPage = async (
  postId: number,
  cursor: string | null,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch
): Promise<CommentsPage> => {
  const response = await fetchImpl(commentsPath(postId, cursor), {
    signal,
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new CommentsRequestError(response.status);
  const parsed: CommentsPage = responseSchema.parse(await response.json()).data;
  return parsed;
};
