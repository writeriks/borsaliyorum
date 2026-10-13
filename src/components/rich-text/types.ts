/**
 * Render'a hazır entity'ler. Sunucuda saklanan `Entity` (ADR-0002) ile farkı: mention, yazıldığı
 * ad yerine `userId`'den çözülmüş **güncel** kullanıcı adını taşır; çözülemeyen mention bu listeye
 * hiç girmez (düz metin). Offset'ler yine UTF-16, `[start, end)`.
 */
export type RichTextEntity =
  | { type: 'cashtag'; start: number; end: number; ticker: string }
  | { type: 'hashtag'; start: number; end: number; slug: string }
  | { type: 'mention'; start: number; end: number; username: string; displayName: string }
  | { type: 'url'; start: number; end: number; href: string };

export const STOCK_TYPES = ['stock', 'crypto', 'other'] as const;
export type StockType = (typeof STOCK_TYPES)[number];

/** Cashtag linki ve hover kartı için hisse özeti (fiyat yok, v1 kapsamı). */
export type StockSummary = { ticker: string; companyName: string; stockType: StockType };

/** Hisse kodu → özet. İndekste olmayan (listeden çıkmış) hisse düz metin render edilir. */
export type StockLookup = Readonly<Record<string, StockSummary>>;
