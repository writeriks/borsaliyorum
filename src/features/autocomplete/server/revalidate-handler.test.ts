import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '@/lib/logger';

import { handleRevalidateStocksRequest } from './revalidate-handler';

const SECRET = 's'.repeat(40);
const silent = createLogger({ level: 'silent' });

const post = (authorization?: string): Request =>
  new Request('http://app.test/api/revalidate/stocks', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
  });

describe('POST /api/revalidate/stocks', () => {
  it('doğru secret → önbellek geçersiz kılınır, 200', async () => {
    const invalidate = vi.fn(async () => undefined);
    const response = await handleRevalidateStocksRequest(post(`Bearer ${SECRET}`), {
      secret: SECRET,
      invalidate,
      logger: silent,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true, data: { revalidated: true } });
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it.each([undefined, 'Bearer yanlis', `Basic ${SECRET}`, `Bearer ${SECRET}x`, SECRET])(
    'yanlış/eksik yetki (%s) → 401, geçersiz kılma yok',
    async authorization => {
      const invalidate = vi.fn(async () => undefined);
      const response = await handleRevalidateStocksRequest(post(authorization), {
        secret: SECRET,
        invalidate,
        logger: silent,
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
      expect(invalidate).not.toHaveBeenCalled();
    }
  );

  it('secret tanımsızsa uç kapalı → 404', async () => {
    const invalidate = vi.fn(async () => undefined);
    const response = await handleRevalidateStocksRequest(post('Bearer '), {
      secret: undefined,
      invalidate,
      logger: silent,
    });
    expect(response.status).toBe(404);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('geçersiz kılma hatası 500 INTERNAL, ayrıntı sızmaz', async () => {
    const response = await handleRevalidateStocksRequest(post(`Bearer ${SECRET}`), {
      secret: SECRET,
      invalidate: async () => {
        throw new Error('purge api down: token=abc');
      },
      logger: silent,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: 'INTERNAL' });
  });
});
