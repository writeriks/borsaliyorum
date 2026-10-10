import { describe, expect, it } from 'vitest';

import {
  clearedSessionCookieOptions,
  CSRF_COOKIE,
  csrfCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from './cookies';

describe('oturum çerezi bayrakları', () => {
  it('__session: HttpOnly, Secure, SameSite=Lax, Path=/', () => {
    expect(SESSION_COOKIE).toBe('__session');
    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  });

  it('ömür 14 gün (eski 1 saatlik ID token hatasının regresyonu)', () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(14 * 24 * 60 * 60);
    expect(SESSION_MAX_AGE_SECONDS).toBeGreaterThan(60 * 60);
  });

  it('çıkışta aynı bayraklar ve Max-Age=0 (eski logout çerezi silmiyordu)', () => {
    expect(clearedSessionCookieOptions()).toEqual({ ...sessionCookieOptions(), maxAge: 0 });
  });

  it('CSRF çerezi __Host- önekli, HttpOnly, SameSite=Strict', () => {
    expect(CSRF_COOKIE.startsWith('__Host-')).toBe(true);
    expect(csrfCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
  });
});
