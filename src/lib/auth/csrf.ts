import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Cookie set eden uçların (`/api/auth/session`) CSRF koruması (auth-session "Güvenlik"):
 * 1. `Origin` kendi host'umuz değilse 403 (`Sec-Fetch-Site` varsa `same-origin` olmalı).
 * 2. Double-submit: `__Host-csrf` çerezi ile `x-csrf-token` başlığı birebir aynı olmalı.
 * SameSite=Lax tek başına yetmez: üst düzey POST dışındaki senaryolar ve alt alan adları.
 */

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const generateCsrfToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

export const isWellFormedCsrfToken = (value: string | null | undefined): value is string =>
  typeof value === 'string' && TOKEN_PATTERN.test(value);

/** Sabit zamanlı karşılaştırma; biçimsiz ya da eksik değer her zaman reddedilir. */
export const verifyCsrfToken = (
  cookieValue: string | null | undefined,
  headerValue: string | null | undefined
): boolean => {
  if (!isWellFormedCsrfToken(cookieValue) || !isWellFormedCsrfToken(headerValue)) return false;
  return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(headerValue));
};

type HeaderReader = { get(name: string): string | null };

/**
 * İsteğin kendi sitemizden geldiğini doğrular. Host, proxy'nin (Vercel) yazdığı
 * `x-forwarded-host`'tan, yoksa `host`'tan okunur. Origin'siz istek reddedilir: tarayıcılar
 * `fetch` ile yapılan POST/DELETE'te Origin'i her zaman gönderir.
 */
export const isSameOriginRequest = (headers: HeaderReader): boolean => {
  const fetchSite = headers.get('sec-fetch-site');
  if (fetchSite !== null && fetchSite !== 'same-origin') return false;

  const origin = headers.get('origin');
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!origin || !host) return false;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  if (originUrl.protocol !== 'https:' && originUrl.protocol !== 'http:') return false;
  // http yalnızca yerel geliştirme/E2E için (Secure çerez yine de localhost'a özgü çalışır)
  if (originUrl.protocol === 'http:' && !isLoopbackHost(originUrl.hostname)) return false;
  return originUrl.host.toLowerCase() === host.split(',')[0]?.trim().toLowerCase();
};

const isLoopbackHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
