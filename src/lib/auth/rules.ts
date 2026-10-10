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

const NEXT_BASE = 'https://borsaliyorum.invalid';
/** `%252F` gibi çok katmanlı kodlamayı da açmak için üst sınır (sonsuz döngü olmasın). */
const MAX_DECODE_ROUNDS = 3;

/**
 * Yüzde kodlamasını sabitlenene kadar açar. Bozuk kodlama (`%zz`) → null: güvenli yol
 * üretmez, reddedilir.
 */
const fullyDecode = (value: string): string | null => {
  let current = value;
  for (let round = 0; round < MAX_DECODE_ROUNDS; round += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return null;
    }
    if (decoded === current) return current;
    current = decoded;
  }
  return current;
};

/**
 * Normalize edilmiş yol başka bir host'a götürebilir mi? `//host` tarayıcıda protokol-göreli
 * URL'dir; `\` bazı tarayıcılarda `/` sayılır; sekme/satır sonu URL ayrıştırıcısınca silinir
 * (`/\t/evil.com` → `//evil.com`). Kodlanmış biçimleri (`%2F`, `%5C`, `%09`) de açıp bakılır:
 * bir sonraki katman (proxy, CDN, tarayıcı) yolu çözebilir.
 */
const isUnsafePathname = (pathname: string): boolean => {
  const decoded = fullyDecode(pathname);
  if (decoded === null) return true;
  return (
    pathname.startsWith('//') ||
    pathname.includes('\\') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    hasControlCharacter(decoded)
  );
};

/**
 * Girişten sonra dönülecek yol (`?next=`). Açık yönlendirmeyi önlemek için yalnızca aynı
 * sitedeki mutlak yol kabul edilir: `//evil.com`, `/\evil.com`, şemalı URL ve kontrol
 * karakterleri reddedilir. Kontrol **normalize edilmiş** sonuç üzerinde de yapılır:
 * `/.//evil.com`, `/a/..//evil.com`, `/%2e//evil.com` ham haliyle `/` ile başlar ama URL
 * ayrıştırıcısından `//evil.com` olarak çıkar. Auth sayfalarının kendisine dönülmez (döngü olmasın).
 *
 * Dönüş, tarayıcının gideceği **ham yol**dur (yerel öneki dahil, ör. `/en/akis`). Sunucuda
 * buna yönlendirirken `next/navigation`'ın `redirect`'i kullanılır; next-intl'inki öneki
 * ikinci kez ekler (`/en/en/akis`).
 */
export const safeNextPath = (raw: string | null | undefined): string | null => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  if (raw.includes('\\') || hasControlCharacter(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, NEXT_BASE);
  } catch {
    return null;
  }
  if (url.origin !== NEXT_BASE) return null;
  if (isUnsafePathname(url.pathname)) return null;
  const path = stripLocalePrefix(fullyDecode(url.pathname) ?? url.pathname);
  if (AUTH_PAGE_PATHS.some(page => path === page || path.startsWith(`${page}/`))) return null;
  return `${url.pathname}${url.search}`;
};

/** `/en/akis` → `/akis`; varsayılan dil (tr) önek almaz. */
export const stripLocalePrefix = (pathname: string): string =>
  pathname.replace(/^\/en(?=\/|$)/, '') || '/';

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
};

/** Giriş/kayıt/onboarding sayfaları (yerel önek olmadan). */
export const AUTH_PAGE_PATHS = ['/giris', '/kayit', '/hos-geldin'] as const;
