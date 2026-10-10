import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { html, startTestHttpServer, type TestHttpServer } from '@tests/utils/test-http-server';

import {
  anonymousSessionStub,
  handleLinkPreviewRequest,
  LINK_PREVIEW_RATE_LIMIT,
  type LinkPreviewHandlerDeps,
} from './route-handler';

const silent = createLogger({ level: 'silent' });
const T0 = new Date('2026-10-10T12:00:00.000Z');

let server: TestHttpServer;

beforeAll(async () => {
  server = await startTestHttpServer();
  server.route(
    '/haber',
    html(
      '<html><head><meta property="og:title" content="THYAO &amp; filo"><meta property="og:description" content="Açıklama"><meta property="og:site_name" content="Örnek"></head><body>gövde</body></html>'
    )
  );
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  // Yerel test sunucusu bilinçli olarak politika dışı (yalnızca test env'i).
  vi.stubEnv('SAFE_FETCH_TEST_ALLOW', '127.0.0.1');
  await getDb().linkPreview.deleteMany();
  await getDb().rateLimitBucket.deleteMany();
  server.hits.clear();
});

describe('GET /api/link-preview', () => {
  const asUser = (userId: number): LinkPreviewHandlerDeps => ({
    getSessionUser: async () => ({ userId }),
    logger: silent,
    now: () => T0,
  });
  const get = (query: string, deps: LinkPreviewHandlerDeps): Promise<Response> =>
    handleLinkPreviewRequest(new Request(`http://app.test/api/link-preview${query}`), deps);

  it('oturum yoksa 401 UNAUTHENTICATED; S5 öncesi stub her isteği anonim sayar', async () => {
    const response = await get(`?url=${encodeURIComponent(`${server.origin}/haber`)}`, {
      getSessionUser: anonymousSessionStub,
      logger: silent,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
    expect(server.hits.get('/haber')).toBeUndefined();
  });

  it.each([
    '',
    '?url=',
    '?url=kap.org.tr',
    '?url=ftp%3A%2F%2Ffoo.com%2F',
    `?url=https://a.com/${'x'.repeat(2100)}`,
  ])('geçersiz sorgu %s → 400 VALIDATION', async query => {
    const response = await get(query.slice(0, 3000), asUser(1));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'VALIDATION' });
  });

  it('girişli kullanıcıya önizleme döner', async () => {
    const response = await get(`?url=${encodeURIComponent(`${server.origin}/haber`)}`, asUser(1));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, max-age=300');
    expect(await response.json()).toEqual({
      ok: true,
      data: { preview: expect.objectContaining({ title: 'THYAO & filo', host: '127.0.0.1' }) },
    });
  });

  it('engellenen hedef hata değil: 200 ve preview null', async () => {
    const response = await get(
      `?url=${encodeURIComponent('http://169.254.169.254/latest/meta-data/')}`,
      asUser(1)
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { preview: null } });
  });

  it('kullanıcı başına dakikada 20 istek; 21. → 429 RATE_LIMITED + Retry-After', async () => {
    const query = `?url=${encodeURIComponent(`${server.origin}/haber`)}`;
    for (let i = 0; i < LINK_PREVIEW_RATE_LIMIT.limit; i += 1) {
      expect((await get(query, asUser(7))).status).toBe(200);
    }
    const limited = await get(query, asUser(7));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('60');
    expect(await limited.json()).toEqual({
      ok: false,
      error: 'RATE_LIMITED',
      meta: { retryAfter: 60 },
    });
    // Başka kullanıcı etkilenmez.
    expect((await get(query, asUser(8))).status).toBe(200);
  });

  it('beklenmeyen hata 500 INTERNAL olur, ayrıntı sızmaz', async () => {
    const response = await get(`?url=${encodeURIComponent(`${server.origin}/haber`)}`, {
      ...asUser(1),
      getSessionUser: async () => {
        throw new Error('db down: postgres://secret');
      },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: 'INTERNAL' });
  });
});
