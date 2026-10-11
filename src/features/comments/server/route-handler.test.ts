import { describe, expect, it, vi } from 'vitest';

import { ErrorCode, fail, ok } from '@/lib/errors';
import { createMemoryRateLimiter } from '@/lib/rate-limit/memory';

vi.mock('./queries', () => ({ getCommentsPage: vi.fn() }));

const { COMMENTS_IP_RATE_LIMIT, handleCommentsRequest } = await import('./route-handler');

const request = (query = '', ip = '203.0.113.7'): Request =>
  new Request(`https://example.test/api/posts/1/comments${query}`, {
    headers: { 'x-real-ip': ip },
  });

const freshLimiter = () => createMemoryRateLimiter(COMMENTS_IP_RATE_LIMIT);
const EMPTY = { items: [], nextCursor: null };

describe('GET /api/posts/[id]/comments', () => {
  it('200: Result zarfı, kişiye özel yanıt önbelleğe girmez; imleç DAL’a iletilir', async () => {
    const load = vi.fn(async () => ok(EMPTY));
    const response = await handleCommentsRequest(request('?cursor=abc'), '42', {
      load,
      limiter: freshLimiter(),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ ok: true, data: EMPTY });
    expect(load).toHaveBeenCalledWith(42, 'abc');
  });

  it('imleçsiz istek ilk sayfa (null)', async () => {
    const load = vi.fn(async () => ok(EMPTY));
    await handleCommentsRequest(request(), '7', { load, limiter: freshLimiter() });
    expect(load).toHaveBeenCalledWith(7, null);
  });

  it('geçersiz gönderi kimliği ya da imleç → 400 VALIDATION, DAL çağrılmaz', async () => {
    const load = vi.fn(async () => ok(EMPTY));
    for (const [id, query] of [
      ['abc', ''],
      ['0', ''],
      ['012', ''],
      ['2147483648', ''],
      ['1', `?cursor=${'x'.repeat(129)}`],
      ['1', '?cursor='],
    ] as const) {
      const response = await handleCommentsRequest(request(query), id, {
        load,
        limiter: freshLimiter(),
      });
      expect(response.status, `${id}${query}`).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: 'VALIDATION' });
    }
    expect(load).not.toHaveBeenCalled();
  });

  it('DAL NOT_FOUND → 404, VALIDATION → 400; beklenmeyen hata → 500 INTERNAL (ayrıntı yok)', async () => {
    const limiter = freshLimiter();
    const notFound = await handleCommentsRequest(request(), '1', {
      load: async () => fail(ErrorCode.NOT_FOUND),
      limiter,
    });
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get('cache-control')).toBe('no-store');

    const silent = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const crashed = await handleCommentsRequest(request(), '1', {
      load: async () => {
        throw new Error('db down: secret detail');
      },
      limiter,
      logger: { ...silent, child: () => ({ ...silent, child: vi.fn() }) },
    });
    expect(crashed.status).toBe(500);
    expect(await crashed.text()).not.toContain('secret');
  });

  it('IP başına dakikada 60: aşımda 429 + Retry-After; başka IP etkilenmez', async () => {
    const limiter = freshLimiter();
    const load = vi.fn(async () => ok(EMPTY));
    const now = () => new Date('2026-10-11T10:00:00.000Z');
    for (let i = 0; i < COMMENTS_IP_RATE_LIMIT.limit; i += 1) {
      expect((await handleCommentsRequest(request(), '1', { load, limiter, now })).status).toBe(
        200
      );
    }
    const limited = await handleCommentsRequest(request(), '1', { load, limiter, now });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    const other = await handleCommentsRequest(request('', '198.51.100.9'), '1', {
      load,
      limiter,
      now,
    });
    expect(other.status).toBe(200);
  });
});
