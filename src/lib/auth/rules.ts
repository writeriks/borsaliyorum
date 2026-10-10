/**
 * Oturum kuralları (saf fonksiyonlar; unit testli). Zamanlar: Firebase `auth_time` saniye,
 * DB alanları `Date`.
 */

/** Session cookie yalnızca son 5 dakikada yapılmış girişten üretilir (eski token ile değil). */
export const MAX_AUTH_AGE_MS = 5 * 60 * 1000;
/** İstemci ile sunucu saati arasındaki küçük farka tolerans (auth_time gelecekte görünebilir). */
const CLOCK_SKEW_MS = 60 * 1000;

export const isAuthTimeFresh = (
  authTimeSeconds: number,
  now: Date,
  maxAgeMs: number = MAX_AUTH_AGE_MS
): boolean => {
  if (!Number.isFinite(authTimeSeconds)) return false;
  const age = now.getTime() - authTimeSeconds * 1000;
  return age <= maxAgeMs && age >= -CLOCK_SKEW_MS;
};

/** Milisaniyeyi atar: `auth_time` saniye hassasiyetinde, karşılaştırma da saniye üzerinden. */
export const truncateToSecond = (date: Date): Date =>
  new Date(Math.floor(date.getTime() / 1000) * 1000);

/**
 * Çıkış/ban anında yazılacak `sessionsValidAfter`: bir sonraki saniyenin başı. Çıkışla aynı
 * saniyede açılmış (başka cihazdaki) oturum da böylece geçersiz olur; bedeli, çıkıştan sonraki
 * ilk saniye içinde yapılan yeni girişin `REAUTH_REQUIRED` alıp tekrar denenmesidir (döngü yok).
 */
export const invalidationMark = (now: Date): Date =>
  new Date(truncateToSecond(now).getTime() + 1000);

/** Oturum, kullanıcının "bu andan önceki oturumlar geçersiz" işaretinden önce mi açılmış? */
export const isSessionInvalidated = (
  authTimeSeconds: number,
  sessionsValidAfter: Date | null
): boolean => {
  if (sessionsValidAfter === null) return false;
  return authTimeSeconds * 1000 < truncateToSecond(sessionsValidAfter).getTime();
};

/**
 * Girişten sonra dönülecek yol (`?next=`). Açık yönlendirmeyi önlemek için yalnızca aynı
 * sitedeki mutlak yol kabul edilir: `//evil.com`, `/\evil.com`, şemalı URL ve kontrol
 * karakterleri reddedilir. Auth sayfalarının kendisine dönülmez (döngü olmasın).
 */
export const safeNextPath = (raw: string | null | undefined): string | null => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (raw.includes('\\') || hasControlCharacter(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, 'https://borsaliyorum.invalid');
  } catch {
    return null;
  }
  if (url.origin !== 'https://borsaliyorum.invalid') return null;
  const path = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  if (AUTH_PAGE_PATHS.some(page => path === page || path.startsWith(`${page}/`))) return null;
  return `${url.pathname}${url.search}`;
};

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

/** Giriş/kayıt/onboarding sayfaları (yerel önek olmadan). */
export const AUTH_PAGE_PATHS = ['/giris', '/kayit', '/hos-geldin'] as const;
