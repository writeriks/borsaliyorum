import { z } from 'zod';

import { FEED_TAB_SLUG, FEED_TABS, type FeedTab } from './types';

/** `GET /api/feed?tab=&cursor=` sorgu parametreleri. Boş imleç = ilk sayfa. */
export const feedQuerySchema = z.object({
  tab: z.enum(FEED_TABS).default('latest'),
  cursor: z.string().min(1).max(200).optional(),
});

/** `GET /api/feed/new?since=` — `since` ilk sayfanın `headCursor`'ı. */
export const newPostsQuerySchema = z.object({ since: z.string().min(1).max(200) });

/** Sayfa URL'sindeki `?sekme=` değeri; tanınmayan değer varsayılan sekmeye düşer (404 değil). */
export const tabFromSearchParam = (value: string | string[] | undefined): FeedTab =>
  value === FEED_TAB_SLUG.popular ? 'popular' : 'latest';

/**
 * İstemcinin kendi API yanıtını doğrulaması: zarf ve sayfalama alanları. Kart içeriği aynı
 * uygulamanın sunucusundan gelir (DTO tek yerde üretilir); burada yalnızca dizi olduğu kontrol edilir.
 */
export const feedPageResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    items: z.array(z.looseObject({ id: z.number().int().positive() })),
    nextCursor: z.string().nullable(),
    headCursor: z.string().nullable(),
  }),
});

export const newPostsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ count: z.number().int().min(0) }),
});
