import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db';

import { consumeAuthRateLimitWith } from './rate-limit';
import { AUTH_RATE_LIMITS } from './rate-limit-keys';

const SECRET = new Uint8Array(randomBytes(32));
const NOW = new Date('2026-10-10T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const deps = (now: Date = NOW) => ({ db: getDb(), secret: SECRET, now });

beforeEach(async () => {
  await getDb().rateLimitBucket.deleteMany();
});

describe('consumeAuthRateLimitWith', () => {
  it('sınır aşılınca RATE_LIMITED kararı + retryAfter', async () => {
    const { limit } = AUTH_RATE_LIMITS['session.uid'];
    for (let i = 0; i < limit; i += 1) {
      expect(await consumeAuthRateLimitWith('session.uid', 'uid-1', deps())).toEqual({ ok: true });
    }
    expect(await consumeAuthRateLimitWith('session.uid', 'uid-1', deps())).toEqual({
      ok: false,
      retryAfterSeconds: 600,
    });
    // Başka hesap etkilenmez
    expect(await consumeAuthRateLimitWith('session.uid', 'uid-2', deps())).toEqual({ ok: true });
  });

  it("DB'de ham IP saklanmaz", async () => {
    await consumeAuthRateLimitWith('session.ip', '203.0.113.7', deps());
    const keys = (await getDb().rateLimitBucket.findMany()).map(row => row.key);
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toContain('203.0.113.7');
  });

  it("IP'li tüketim 24 saatten eski IP kovalarını siler; uid kovalarına dokunmaz", async () => {
    await getDb().rateLimitBucket.createMany({
      data: [
        { key: 'auth.session.ip:eski', windowStart: new Date(NOW.getTime() - 25 * HOUR), count: 1 },
        { key: 'auth.session.ip:taze', windowStart: new Date(NOW.getTime() - 2 * HOUR), count: 1 },
        {
          key: 'auth.session.uid:eski',
          windowStart: new Date(NOW.getTime() - 25 * HOUR),
          count: 1,
        },
      ],
    });
    await consumeAuthRateLimitWith('username-check.ip', '198.51.100.1', deps());
    const keys = (await getDb().rateLimitBucket.findMany({ orderBy: { key: 'asc' } })).map(
      row => row.key
    );
    expect(keys).not.toContain('auth.session.ip:eski');
    expect(keys).toContain('auth.session.ip:taze');
    expect(keys).toContain('auth.session.uid:eski');
  });
});
