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
    '/gir%69s',
    '/en/%6Bayit',
    '',
    `/${'a'.repeat(600)}`,
  ])('reddeder: %s', input => {
    expect(safeNextPath(input)).toBeNull();
  });

  // Normalizasyon (`.`/`..`/`%2e` segmentleri) sonrası `//host` kalan girdiler: tarayıcı
  // `Location: //evil.com`'u protokol-göreli URL olarak başka siteye götürür.
  it.each([
    '/.//evil.com',
    '/a/..//evil.com',
    '/%2e//evil.com',
    '/%2E//evil.com',
    '/a/%2e%2e//evil.com',
    '/./\\evil',
    '//evil.com',
    '/\\evil',
    'https://evil.com',
    '/%2F%2Fevil.com',
    '/%2f/evil.com',
    '/%5Cevil.com',
    '/%5cevil.com',
    '/a/%2e%2e/%2F%2Fevil.com',
    '/%252F%252Fevil.com',
    '/%09/evil.com',
  ])('normalize edilmiş açık yönlendirmeyi reddeder: %s', input => {
    expect(safeNextPath(input)).toBeNull();
  });

  it('normalize edilmiş güvenli yolu döner', () => {
    expect(safeNextPath('/a/../akis')).toBe('/akis');
    expect(safeNextPath('/./akis?x=1')).toBe('/akis?x=1');
  });

  it('null/undefined → null', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
