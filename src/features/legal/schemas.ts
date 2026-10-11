import { z } from 'zod';

/** Yasal metin paketinin yeni sürümünü kabul formu (istemci + sunucu). */
export const legalAcceptanceSchema = z.object({
  /** Koşullar + Topluluk Kuralları + Yatırım Uyarısı'nın yeni sürümleri: zorunlu, işaretsiz kutu. */
  accepted: z.boolean().refine(value => value, 'required'),
  next: z.string().max(512).nullable(),
});
export type LegalAcceptanceInput = z.input<typeof legalAcceptanceSchema>;
