/**
 * LinkPreview önbellek anahtarı için URL normalizasyonu (ADR-0002 Karar 6:
 * `urlHash = sha256(normalizePreviewUrl(url))`). Saf TS, Node API'si yok.
 *
 * Legal (KVKK veri minimizasyonu): izleme parametreleri ve fragment hem saklanan URL'den hem
 * de dışarıya yapılan istekten atılır; aynı sayfanın farklı kampanya linkleri tek kayda iner.
 *
 * Yapılanlar: yalnızca http/https; kullanıcı bilgisi içeren URL reddedilir; host küçük harf ve
 * sondaki nokta atılır; varsayılan port atılır (URL ayrıştırıcısı); fragment atılır; izleme
 * parametreleri atılır; boş sorgu (`?`) atılır. Kalan parametrelerin sırası ve değerleri
 * korunur (sıralamak bazı sitelerde anlamı değiştirebilir).
 */
export const MAX_PREVIEW_URL_LENGTH = 2048;

/** Önekle eşleşen izleme parametreleri (küçük harfe çevrilmiş adla). */
const TRACKING_PREFIXES = ['utm_'] as const;

/** Tam adla eşleşen izleme parametreleri (küçük harfe çevrilmiş adla). */
const TRACKING_PARAMS = new Set([
  // Google / Microsoft / Yandex reklam tıklama kimlikleri
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  '_ga',
  '_gl',
  // Meta / Instagram / X / TikTok / LinkedIn
  'fbclid',
  'igshid',
  'igsh',
  'twclid',
  'ttclid',
  'li_fat_id',
  'ref_src',
  'ref_url',
  // E-posta pazarlama (Mailchimp, HubSpot, Marketo, Vero)
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_id',
  'oly_anon_id',
  'oly_enc_id',
  'rb_clickid',
  's_cid',
]);

export const isTrackingParam = (name: string): boolean => {
  const lower = name.toLowerCase();
  return TRACKING_PARAMS.has(lower) || TRACKING_PREFIXES.some(prefix => lower.startsWith(prefix));
};

/** Normalize edilmiş mutlak URL; önizlenemeyecek bir adresse null. */
export const normalizePreviewUrl = (raw: string): string | null => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username !== '' || url.password !== '') return null;

  url.hostname = url.hostname.replace(/\.+$/, '');
  if (url.hostname === '') return null;
  url.hash = '';

  const params = [...url.searchParams];
  const kept = params.filter(([name]) => !isTrackingParam(name));
  // Değişiklik yoksa sorguya dokunulmaz: yeniden kodlama `%20`/`+` gibi biçimleri değiştirirdi
  if (kept.length !== params.length) url.search = new URLSearchParams(kept).toString();
  // `https://x/a?` → `https://x/a`
  if (url.searchParams.size === 0) url.search = '';

  const normalized = url.href;
  return normalized.length > MAX_PREVIEW_URL_LENGTH ? null : normalized;
};
