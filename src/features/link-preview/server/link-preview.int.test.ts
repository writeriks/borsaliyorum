import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { consumeRateLimit } from '@/lib/rate-limit';
import {
  html,
  redirect,
  startTestHttpServer,
  type TestHttpServer,
} from '@tests/utils/test-http-server';

import { getOrFetchPreview, PREVIEW_TTL_MS, urlHashOf } from './get-or-fetch-preview';
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
  server.route(
    '/basliksiz',
    html('<html><head></head><body><h1>Başlık gövdede</h1></body></html>')
  );
  server.route('/json', html('{}', { contentType: 'application/json' }));
  server.route('/to-private', redirect('http://169.254.169.254/latest/meta-data/'));
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

describe('getOrFetchPreview', () => {
  it('çeker, DTO döner ve 24 saatlik kayıt yazar', async () => {
    const url = `${server.origin}/haber?utm_source=x#a`;
    const preview = await getOrFetchPreview(url, { db: getDb(), logger: silent, now: () => T0 });

    expect(preview).toEqual({
      url: `${server.origin}/haber`,
      host: '127.0.0.1',
      siteName: 'Örnek',
      title: 'THYAO & filo',
      description: 'Açıklama',
    });
    const row = await getDb().linkPreview.findUniqueOrThrow({
      where: { urlHash: urlHashOf(`${server.origin}/haber`) },
    });
    expect(row).toMatchObject({ status: 'ok', finalUrl: `${server.origin}/haber` });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(PREVIEW_TTL_MS.ok);
  });

  it('aynı URL ikinci kez ağdan çekilmez (normalleştirilmiş anahtar)', async () => {
    const deps = { db: getDb(), logger: silent, now: () => T0 };
    await getOrFetchPreview(`${server.origin}/haber`, deps);
    const second = await getOrFetchPreview(`${server.origin}/haber?fbclid=1#x`, deps);
    expect(second?.title).toBe('THYAO & filo');
    expect(server.hits.get('/haber')).toBe(1);
  });

  it('süresi dolan kayıt yeniden çekilir ve güncellenir', async () => {
    await getOrFetchPreview(`${server.origin}/haber`, {
      db: getDb(),
      logger: silent,
      now: () => T0,
    });
    const later = new Date(T0.getTime() + PREVIEW_TTL_MS.ok + 1);
    await getOrFetchPreview(`${server.origin}/haber`, {
      db: getDb(),
      logger: silent,
      now: () => later,
    });
    expect(server.hits.get('/haber')).toBe(2);
    expect(await getDb().linkPreview.count()).toBe(1);
  });

  it.each([
    ['/basliksiz', 'failed'],
    ['/json', 'failed'],
    ['/to-private', 'blocked'],
  ] as const)('%s → null, %s olarak 1 saat önbellekte', async (path, status) => {
    const deps = { db: getDb(), logger: silent, now: () => T0 };
    expect(await getOrFetchPreview(`${server.origin}${path}`, deps)).toBeNull();
    expect(await getOrFetchPreview(`${server.origin}${path}`, deps)).toBeNull();
    expect(server.hits.get(path)).toBe(1);
    const row = await getDb().linkPreview.findFirstOrThrow();
    expect(row).toMatchObject({ status, title: null, description: null });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(PREVIEW_TTL_MS.failed);
  });

  it('allowlist yoksa yerel adres engellenir (üretim davranışı)', async () => {
    vi.stubEnv('SAFE_FETCH_TEST_ALLOW', '');
    expect(
      await getOrFetchPreview(`${server.origin}/haber`, { db: getDb(), logger: silent })
    ).toBeNull();
    expect(server.hits.get('/haber')).toBeUndefined();
    expect((await getDb().linkPreview.findFirstOrThrow()).status).toBe('blocked');
  });

  it('iç linkler (borsaliyorum.com) çekilmez ve kaydedilmez', async () => {
    expect(
      await getOrFetchPreview('https://www.borsaliyorum.com/gonderi/1', {
        db: getDb(),
        logger: silent,
      })
    ).toBeNull();
    expect(await getDb().linkPreview.count()).toBe(0);
  });
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
