import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';

import { consumeRateLimit } from '.';

const T0 = new Date('2026-10-10T12:00:00.000Z');

beforeEach(async () => {
  await getDb().rateLimitBucket.deleteMany();
});

describe('consumeRateLimit', () => {
  it('eşzamanlı isteklerde sayım kaybolmaz: 30 istekten tam 20’si geçer', async () => {
    const rule = { key: 'test:u:1', limit: 20, windowMs: 60_000 };
    const results = await Promise.all(
      Array.from({ length: 30 }, () => consumeRateLimit(getDb(), rule, T0))
    );
    expect(results.filter(r => r.allowed)).toHaveLength(20);
  });

  it('pencere dolunca yeniden izin verir; retryAfter pencere sonuna kadar', async () => {
    const rule = { key: 'test:u:2', limit: 1, windowMs: 60_000 };
    const start = new Date('2026-10-10T12:00:00.000Z');
    expect((await consumeRateLimit(getDb(), rule, start)).allowed).toBe(true);
    expect(await consumeRateLimit(getDb(), rule, new Date('2026-10-10T12:00:45.000Z'))).toEqual({
      allowed: false,
      retryAfterSeconds: 15,
    });
    expect(
      (await consumeRateLimit(getDb(), rule, new Date('2026-10-10T12:01:00.000Z'))).allowed
    ).toBe(true);
  });

  it('transaction istemcisiyle çalışır: işlem geri alınırsa sayaç da geri alınır', async () => {
    const rule = { key: 'test:u:tx', limit: 5, windowMs: 60_000 };
    await expect(
      getDb().$transaction(async tx => {
        expect(await consumeRateLimit(tx, rule, T0)).toEqual({ allowed: true, remaining: 4 });
        throw new Error('işlem iptal');
      })
    ).rejects.toThrow('işlem iptal');
    expect(await getDb().rateLimitBucket.count()).toBe(0);

    await getDb().$transaction(async tx => {
      await consumeRateLimit(tx, rule, T0);
    });
    expect(await getDb().rateLimitBucket.findFirstOrThrow()).toMatchObject({ count: 1 });
  });
});
