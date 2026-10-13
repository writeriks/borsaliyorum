import { describe, expect, it } from 'vitest';

import { createMemoryRateLimiter } from './memory';

const T0 = Date.parse('2026-10-10T12:00:30.000Z');

describe('createMemoryRateLimiter', () => {
  it('pencere içinde limit kadar izin verir, sonrası Retry-After ile reddedilir', () => {
    const limiter = createMemoryRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.consume('a', T0)).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.consume('a', T0)).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.consume('a', T0)).toEqual({ allowed: true, remaining: 0 });
    // Pencere 12:00:00'da başladı; 30 sn kaldı
    expect(limiter.consume('a', T0)).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it('anahtarlar birbirini etkilemez; yeni pencerede sayaç sıfırlanır', () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.consume('a', T0).allowed).toBe(true);
    expect(limiter.consume('a', T0).allowed).toBe(false);
    expect(limiter.consume('b', T0).allowed).toBe(true);
    expect(limiter.consume('a', T0 + 30_000).allowed).toBe(true);
  });

  it('bellek sınırı: maxKeys aşılmaz, önce süresi dolan sonra en eski anahtar atılır', () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3 });
    limiter.consume('eski', T0 - 60_000);
    limiter.consume('a', T0);
    limiter.consume('b', T0);
    limiter.consume('c', T0);
    expect(limiter.size()).toBe(3);
    // 'eski' süresi dolduğu için atıldı; 'a' hâlâ sayılıyor
    expect(limiter.consume('a', T0).allowed).toBe(false);
    limiter.consume('d', T0);
    expect(limiter.size()).toBe(3);
    // En eski ('a') atıldı → yeniden izin
    expect(limiter.consume('a', T0).allowed).toBe(true);
  });

  it.each([
    { limit: 0, windowMs: 1000 },
    { limit: 1.5, windowMs: 1000 },
    { limit: 1, windowMs: 0 },
  ])('geçersiz kural %o → RangeError', options => {
    expect(() => createMemoryRateLimiter(options)).toThrow(RangeError);
  });
});
