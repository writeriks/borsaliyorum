import { describe, expect, it } from 'vitest';

import {
  invalidationMark,
  isAuthTimeFresh,
  isSessionInvalidated,
  MAX_AUTH_AGE_MS,
  safeNextPath,
  truncateToSecond,
} from './rules';

const now = new Date('2026-10-10T12:00:00.000Z');
const seconds = (date: Date): number => Math.floor(date.getTime() / 1000);

describe('auth_time ≤ 5 dk', () => {
  it('az önce yapılan giriş taze', () => {
    expect(isAuthTimeFresh(seconds(now) - 10, now)).toBe(true);
  });

  it('tam 5 dk sınırda taze, 1 sn fazlası değil', () => {
    expect(isAuthTimeFresh(seconds(now) - MAX_AUTH_AGE_MS / 1000, now)).toBe(true);
    expect(isAuthTimeFresh(seconds(now) - MAX_AUTH_AGE_MS / 1000 - 1, now)).toBe(false);
  });

  it('1 saat önceki token (eski hata) reddedilir', () => {
    expect(isAuthTimeFresh(seconds(now) - 3600, now)).toBe(false);
  });

  it('çok ileri tarihli auth_time reddedilir, küçük saat kayması tolere edilir', () => {
    expect(isAuthTimeFresh(seconds(now) + 30, now)).toBe(true);
    expect(isAuthTimeFresh(seconds(now) + 3600, now)).toBe(false);
    expect(isAuthTimeFresh(Number.NaN, now)).toBe(false);
  });
});

describe('sessionsValidAfter', () => {
  it('işaret yoksa oturum geçerli', () => {
    expect(isSessionInvalidated(seconds(now), null)).toBe(false);
  });

  it('çıkıştan önce açılmış oturum geçersiz', () => {
    expect(isSessionInvalidated(seconds(now) - 60, now)).toBe(true);
  });

  it('işaretin saniyesinde ya da sonrasında açılan oturum geçerli: yeniden giriş döngüye girmez', () => {
    const logoutAt = new Date('2026-10-10T12:00:00.900Z');
    expect(isSessionInvalidated(seconds(logoutAt), logoutAt)).toBe(false);
    expect(isSessionInvalidated(seconds(logoutAt) + 5, logoutAt)).toBe(false);
  });

  it('çıkış işareti: çıkışla aynı saniyede açılmış başka cihaz oturumu da geçersiz', () => {
    const logoutAt = new Date('2026-10-10T12:00:00.400Z');
    const mark = invalidationMark(logoutAt);
    expect(mark.toISOString()).toBe('2026-10-10T12:00:01.000Z');
    expect(isSessionInvalidated(seconds(logoutAt), mark)).toBe(true);
    expect(isSessionInvalidated(seconds(logoutAt) + 1, mark)).toBe(false);
  });

  it('truncateToSecond milisaniyeyi atar', () => {
    expect(truncateToSecond(new Date('2026-10-10T12:00:00.999Z')).toISOString()).toBe(
      '2026-10-10T12:00:00.000Z'
    );
  });
});

describe('safeNextPath (açık yönlendirme koruması)', () => {
  it.each([
    ['/akis', '/akis'],
    ['/en/akis', '/en/akis'],
    ['/gonderi/42?yorum=1', '/gonderi/42?yorum=1'],
    ['/u/ayse%20k', '/u/ayse%20k'],
  ])('kabul: %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    'https://evil.example/akis',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    'akis',
    '/akis\nSet-Cookie: x',
    '/giris',
    '/en/giris?next=/akis',
    '/kayit',
    '/hos-geldin',
    '',
    `/${'a'.repeat(600)}`,
  ])('reddeder: %s', input => {
    expect(safeNextPath(input)).toBeNull();
  });

  it('null/undefined → null', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
