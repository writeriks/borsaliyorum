/**
 * GEÇİCİ KOPYA — asıl uygulama foundation dalında `src/lib/link-preview/normalize-url.ts`
 * olarak yazılıyor (S3 düzeltmeleri). O dosya bu dala geldiğinde bu dosya silinir ve
 * import `@/lib/link-preview/normalize-url`'ye çevrilir; imza aynıdır.
 *
 * Önbellek anahtarı için URL'yi kanonikleştirir: fragment ve bilinen izleme parametreleri
 * atılır, gerisi (sıra dahil) korunur. Geçersiz URL'de `TypeError` fırlatır.
 */
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
]);

export const normalizePreviewUrl = (url: string): string => {
  const parsed = new URL(url);
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) parsed.searchParams.delete(key);
  }
  // `searchParams` boşalınca `?` kalmasın.
  if ([...parsed.searchParams.keys()].length === 0) parsed.search = '';
  return parsed.href;
};
