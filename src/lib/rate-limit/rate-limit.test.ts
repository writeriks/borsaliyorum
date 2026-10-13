import { describe, expect, it, vi } from 'vitest';

import { consumeRateLimit, RATE_LIMIT_KEY_MAX_LENGTH, type RateLimitDb } from '.';

const fakeDb = (count: number): RateLimitDb & { calls: number } => {
  const db = {
    calls: 0,
    $queryRaw: vi.fn(async () => {
      db.calls += 1;
      return [{ count }];
    }),
  };
  return db as unknown as RateLimitDb & { calls: number };
};

const T0 = new Date('2026-10-10T12:00:30.000Z');

describe('consumeRateLimit — kural doğrulaması (DB’ye gitmeden)', () => {
  it.each([
    ['boş key', { key: '', limit: 1, windowMs: 60_000 }],
    [
      '121 karakter key',
      { key: 'k'.repeat(RATE_LIMIT_KEY_MAX_LENGTH + 1), limit: 1, windowMs: 60_000 },
    ],
    ['limit 0', { key: 'a', limit: 0, windowMs: 60_000 }],
    ['kesirli limit', { key: 'a', limit: 1.5, windowMs: 60_000 }],
    ['windowMs 0', { key: 'a', limit: 1, windowMs: 0 }],
    ['24 saatten uzun pencere', { key: 'a', limit: 1, windowMs: 24 * 60 * 60 * 1000 + 1 }],
  ])('%s → RangeError', async (_name, rule) => {
    const db = fakeDb(1);
    await expect(consumeRateLimit(db, rule, T0)).rejects.toBeInstanceOf(RangeError);
    expect(db.calls).toBe(0);
  });

  it('tam 120 karakter key kabul edilir', async () => {
    const db = fakeDb(1);
    const rule = { key: 'k'.repeat(RATE_LIMIT_KEY_MAX_LENGTH), limit: 1, windowMs: 60_000 };
    expect(await consumeRateLimit(db, rule, T0)).toEqual({ allowed: true, remaining: 0 });
  });

  it('limit aşılınca pencere sonuna kadar retryAfter döner', async () => {
    const rule = { key: 'a', limit: 2, windowMs: 60_000 };
    expect(await consumeRateLimit(fakeDb(3), rule, T0)).toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    });
  });
});
