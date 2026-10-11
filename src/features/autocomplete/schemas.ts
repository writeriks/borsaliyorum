import { z } from 'zod';

import { foldTag } from '@/lib/entities';
import { MAX_HASHTAG_LENGTH } from '@/lib/entities/hashtag';

/**
 * Autocomplete sorgu şemaları (ADR-0002 Karar 4: `q` 0–20 karakter, kullanıcı/etiket için
 * katlanmış). Sorgu `foldTag` ile katlanır: `@İSMA` → `isma`, `#Temettü` → `temettu`; böylece
 * Türkçe büyük/küçük harf farkı (İ/ı) sunucu sorgusuna hiç girmez.
 */

/** Kullanıcı adı kuralı `^[a-z0-9_]{3,20}$`; önek 0–20 karakter. */
export const USER_QUERY_MAX = 20;

/** Ham sorgu sınırı: katlamadan önce de uzun girdiyi işlemeye almayız. */
const RAW_QUERY_MAX = 100;

const trimmedQuery = z
  .string()
  .max(RAW_QUERY_MAX)
  .optional()
  .transform(value => (value ?? '').trim());

const rawQuery = trimmedQuery.transform(foldTag);

const codePoints = (value: string): number => [...value].length;

export const userQuerySchema = z.object({
  q: rawQuery.pipe(z.string().regex(new RegExp(`^[a-z0-9_]{0,${USER_QUERY_MAX}}$`))),
});

// Etiket gövdesi composer tetikleyicisiyle aynı karakter sınıfı (`#[\p{L}\p{N}\p{M}_]`)
const TAG_QUERY_RE = /^[\p{L}\p{N}\p{M}_]*$/u;

/**
 * Etiket sınırı katlamadan **önce** de uygulanır: NFKC bazı karakterleri açar (`ﬁ` → `fi`,
 * U+FDFA → 18 harf), 50 harflik girdi katlanınca çok daha uzun bir aralık sorgusuna dönüşmesin.
 * Katlanmış hâl de 50'yi aşamaz (slug sınırı, `toHashtagSlug`); aşan sorgu hiçbir etiketle eşleşmez.
 */
export const tagQuerySchema = z.object({
  q: trimmedQuery
    .refine(value => codePoints(value) <= MAX_HASHTAG_LENGTH)
    .transform(foldTag)
    .pipe(
      z
        .string()
        .regex(TAG_QUERY_RE)
        .refine(value => codePoints(value) <= MAX_HASHTAG_LENGTH)
    ),
});

export type UserQuery = z.infer<typeof userQuerySchema>;
export type TagQuery = z.infer<typeof tagQuerySchema>;

/** `URLSearchParams` → şema girdisi; tekrarlanan `q` reddedilir (belirsiz istek). */
export const readQueryParam = (url: URL): { q?: string } | null => {
  const all = url.searchParams.getAll('q');
  if (all.length > 1) return null;
  return all[0] === undefined ? {} : { q: all[0] };
};
