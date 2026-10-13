/**
 * Next.js cache tag adları (tek kaynak). Okuma tarafı (S11 akış, S12 detay) `cacheTag(...)` ile
 * aynı adları kullanır; yazma action'ları (S10) bunları geçersiz kılar.
 */
export const CACHE_TAGS = {
  /** Akış listeleri (takip, son). */
  feed: 'feed',
  post: (postId: number): string => `post:${postId}`,
  comments: (postId: number): string => `post:${postId}:comments`,
} as const;
