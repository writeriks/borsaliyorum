/**
 * Oturum ve CSRF çerezlerinin adları ve bayrakları (auth-session "Güvenlik"). Saf modül:
 * proxy (edge), route handler ve testler aynı tanımı kullanır.
 */

/** Firebase Hosting/CDN'lerin geçirdiği tek çerez adı; başka host'ta da zararsız. */
export const SESSION_COOKIE = '__session';

/** Firebase session cookie üst sınırı 14 gün; sessiz yenileme yok (ADR-0001 Karar 5). */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

/**
 * Double-submit CSRF çerezi. `__Host-` öneki: yalnızca Secure, Path=/ ve Domain'siz
 * yazılabilir → alt alan adından üzerine yazılamaz. HttpOnly: değer istemciye yanıt gövdesiyle
 * verilir (GET /api/auth/csrf), JS çerezden okumaz.
 */
export const CSRF_COOKIE = '__Host-csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_MAX_AGE_SECONDS = 2 * 60 * 60;

export type CookieOptions = {
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: 'lax' | 'strict';
  readonly path: '/';
  readonly maxAge: number;
};

/** `__session`: HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=14 gün. */
export const sessionCookieOptions = (maxAge: number = SESSION_MAX_AGE_SECONDS): CookieOptions => ({
  httpOnly: true,
  // localhost'ta da Secure: Chromium localhost'u güvenli bağlam sayar (ADR-0003)
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

/** Çıkışta çerezi silmek için: aynı bayraklar + Max-Age=0. */
export const clearedSessionCookieOptions = (): CookieOptions => sessionCookieOptions(0);

export const csrfCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/',
  maxAge: CSRF_MAX_AGE_SECONDS,
});
