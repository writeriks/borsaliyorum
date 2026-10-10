import { z } from 'zod';

import { toSafeMediaSrc } from '@/lib/media';

import { STOCK_TYPES } from './types';

/**
 * S7/S9 uçlarının yanıt şemaları. Dış dünyadan gelen her veri parse edilir (coding-standards);
 * şemaya uymayan yanıt "hata" durumuna düşer, composer çalışmaya devam eder.
 */
export const stockIndexSchema = z.array(
  z.object({
    t: z.string().min(1).max(16),
    n: z.string().max(200),
    type: z.enum(STOCK_TYPES),
    m: z.number().int().nonnegative().optional(),
  })
);

export const defaultStocksSchema = z.object({
  source: z.enum(['following', 'mostMentioned']),
  tickers: z.array(z.string().min(1).max(16)).max(50),
});

// Bilinmeyen alanlar (ör. yanlışlıkla eklenmiş `email`) `z.object` ile atılır, istemciye taşınmaz
export const userSuggestionsSchema = z.array(
  z.object({
    username: z.string().regex(/^[A-Za-z0-9_]{1,20}$/),
    displayName: z.string().max(100),
    // https + medya allowlist host'u + port/kullanıcı bilgisi yok; uymayan → null (baş harfler).
    // Tüm yanıtı reddetmek yerine yalnızca görsel düşer: öneri listesi çalışmaya devam eder
    avatarUrl: z.string().max(2048).nullable().transform(toSafeMediaSrc),
    following: z.boolean(),
  })
);

export const tagSuggestionsSchema = z.array(
  z.object({
    slug: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    count: z.number().int().nonnegative(),
  })
);

export const linkPreviewResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    url: z.url({ protocol: /^https?$/ }),
    host: z.string().min(1).max(253),
    siteName: z.string().max(200).nullable(),
    title: z.string().min(1).max(300),
    description: z.string().max(500).nullable(),
  }),
  z.object({ status: z.literal('none') }),
]);
