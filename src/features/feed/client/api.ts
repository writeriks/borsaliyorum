import type { PostCardData } from '@/features/posts/types';
import { ErrorCode, isErrorCode } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { feedPageResponseSchema, newPostsResponseSchema } from '../schemas';
import type { FeedPage, FeedTab } from '../types';

/** `/api/feed*` başarısızlığı; `code` kullanıcı mesajına ve yönlendirmeye eşlenir. */
export class FeedRequestError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(code);
    this.name = 'FeedRequestError';
    this.code = code;
  }
}

const readError = async (response: Response): Promise<FeedRequestError> => {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body && isErrorCode(body.error)) {
      return new FeedRequestError(body.error);
    }
  } catch (error) {
    // Gövde JSON değilse (ör. proxy hata sayfası) koda HTTP durumundan düşülür
    logger.warn('feed error body unreadable', { err: error, status: response.status });
  }
  return new FeedRequestError(
    response.status === 401 ? ErrorCode.UNAUTHENTICATED : ErrorCode.INTERNAL
  );
};

const getJson = async (url: string, signal?: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, {
    signal,
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw await readError(response);
  return response.json();
};

/** Bir akış sayfası (`cursor` null → ilk sayfa). Zarf Zod ile doğrulanır. */
export const fetchFeedPage = async (
  tab: FeedTab,
  cursor: string | null,
  signal?: AbortSignal
): Promise<FeedPage> => {
  const params = new URLSearchParams({ tab });
  if (cursor) params.set('cursor', cursor);
  const parsed = feedPageResponseSchema.safeParse(await getJson(`/api/feed?${params}`, signal));
  if (!parsed.success) throw new FeedRequestError(ErrorCode.INTERNAL);
  return {
    // Kart DTO'su aynı uygulamanın sunucusunda tek yerde üretilir (`toPostCardData`)
    items: parsed.data.data.items as unknown as PostCardData[],
    nextCursor: parsed.data.data.nextCursor,
    headCursor: parsed.data.data.headCursor,
  };
};

/** `since` (ilk sayfanın başı) sonrası yeni gönderi sayısı. */
export const fetchNewPostCount = async (since: string, signal?: AbortSignal): Promise<number> => {
  const parsed = newPostsResponseSchema.safeParse(
    await getJson(`/api/feed/new?${new URLSearchParams({ since })}`, signal)
  );
  if (!parsed.success) throw new FeedRequestError(ErrorCode.INTERNAL);
  return parsed.data.data.count;
};
