import { z } from 'zod';

import type { Locale } from '@/i18n/routing';
import type { LegalDocumentKey } from '@/lib/legal/versions';

// Yasal metinler ana katalogda değil (`messages/{tr,en}.json` her sayfada istemciye iner);
// yalnızca /yasal/* sayfalarının sunucu bileşenleri bu dosyaları okur.
import en from '../../../messages/legal/en.json';
import tr from '../../../messages/legal/tr.json';

/**
 * Doldurulması gereken yer tutucular (`[[ph:<anahtar>]]`). Yayına almadan önce gerçek değerle
 * değiştirilir; liste docs/legal/README.md'de de var.
 */
export const PLACEHOLDER_KEYS = [
  'company',
  'address',
  'mersis',
  'kep',
  'dbRegion',
  'transferSafeguard',
  'court',
] as const;
export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

const text = z.string().trim().min(1);

const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text }).strict(),
  z.object({ type: z.literal('ul'), items: z.array(text).min(1) }).strict(),
  z
    .object({
      type: z.literal('table'),
      caption: text,
      head: z.array(text).min(2),
      rows: z.array(z.array(text)).min(1),
    })
    .strict()
    .refine(table => table.rows.every(row => row.length === table.head.length), {
      message: 'her satır başlık kadar hücre içermeli',
    }),
  /** Tam SPK uyarı metni: tek kaynak `legal.disclaimer.full` (ana katalog, footer ile aynı). */
  z.object({ type: z.literal('disclaimerFull') }).strict(),
]);
export type LegalBlock = z.infer<typeof blockSchema>;

const sectionSchema = z
  .object({
    /** Bağlantı çapası; iki dilde aynı (paylaşılan linkler dil değişince de çalışsın). */
    id: z.string().regex(/^[a-z0-9-]+$/),
    heading: text,
    blocks: z.array(blockSchema).min(1),
  })
  .strict();
export type LegalSection = z.infer<typeof sectionSchema>;

const documentSchema = z
  .object({ title: text, description: text, sections: z.array(sectionSchema).min(1) })
  .strict();
export type LegalDocumentContent = z.infer<typeof documentSchema>;

const catalogSchema = z
  .object({
    chrome: z.object({ toc: text, version: text, effective: text, otherDocuments: text }).strict(),
    placeholders: z
      .object(
        Object.fromEntries(PLACEHOLDER_KEYS.map(key => [key, text])) as Record<
          PlaceholderKey,
          typeof text
        >
      )
      .strict(),
    documents: z
      .object({
        privacy: documentSchema,
        cookies: documentSchema,
        terms: documentSchema,
        disclaimer: documentSchema,
        community: documentSchema,
      } satisfies Record<LegalDocumentKey, typeof documentSchema>)
      .strict(),
  })
  .strict();
export type LegalCatalog = z.infer<typeof catalogSchema>;

const RAW: Record<Locale, unknown> = { tr, en };
const cache = new Map<Locale, LegalCatalog>();

/** Katalog ilk kullanımda şemayla doğrulanır; bozuk içerik sessizce render edilmez. */
export const getLegalCatalog = (locale: Locale): LegalCatalog => {
  const cached = cache.get(locale);
  if (cached) return cached;
  const parsed = catalogSchema.parse(RAW[locale]);
  cache.set(locale, parsed);
  return parsed;
};
