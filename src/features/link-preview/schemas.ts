import { z } from 'zod';

import { MAX_URL_LENGTH } from '@/lib/entities/url';

/** `GET /api/link-preview?url=` sorgusu. Kalan güvenlik kuralları safeFetch'te. */
export const linkPreviewQuerySchema = z.object({
  url: z
    .string()
    .trim()
    .max(MAX_URL_LENGTH)
    .pipe(z.url({ protocol: /^https?$/ })),
});

export type LinkPreviewQuery = z.infer<typeof linkPreviewQuerySchema>;
