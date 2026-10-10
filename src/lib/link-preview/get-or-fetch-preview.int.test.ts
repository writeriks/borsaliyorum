import type { LookupAddress } from 'node:dns';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import type { Resolver } from '@/lib/safe-fetch';
import {
  html,
  redirect,
  startTestHttpServer,
  type RouteHandler,
  type TestHttpServer,
} from '@tests/utils/test-http-server';

import { getOrFetchPreview, getOwnHosts, PREVIEW_TTL_MS } from './get-or-fetch-preview';
import { previewUrlHash } from './url-hash';

const silent = createLogger({ level: 'silent' });
const T0 = new Date('2026-10-10T12:00:00.000Z');
const HABER_HTML =
  '<html><head><meta property="og:title" content="THYAO &amp; filo"><meta property="og:description" content="Açıklama"><meta property="og:site_name" content="Örnek"></head><body>gövde</body></html>';

const delayed =
  (ms: number, handler: RouteHandler): RouteHandler =>
  (req, res) => {
    setTimeout(() => handler(req, res), ms);
  };

/** Listedeki her host'u yerel test sunucusuna çözen sahte DNS. */
const localDns =
  (...hosts: string[]): Resolver =>
  async hostname => {
    if (!hosts.includes(hostname)) {
      throw Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' });
    }
    const address: LookupAddress = { address: '127.0.0.1', family: 4 };
    return [address];
  };

let server: TestHttpServer;

beforeAll(async () => {
  server = await startTestHttpServer();
  server.route('/haber', html(HABER_HTML));
  server.route(
    '/basliksiz',
    html('<html><head></head><body><h1>Başlık gövdede</h1></body></html>')
  );
  server.route('/json', html('{}', { contentType: 'application/json' }));
  server.route('/to-private', redirect('http://169.254.169.254/latest/meta-data/'));
  server.route('/kisa', redirect(`http://kotu.com:${server.port}/haber`));
  server.route('/eski', redirect(`http://haber.ornek.com.tr:${server.port}/haber`, 301));
  server.route('/yavas', delayed(100, html(HABER_HTML)));
  server.route('/yavas-404', delayed(150, html('<title>yok</title>', { status: 404 })));
});

afterAll(async () => {
  await server.close();
});

beforeEach(async () => {
  // Yerel test sunucusu bilinçli olarak politika dışı (yalnızca test env'i).
  vi.stubEnv('SAFE_FETCH_TEST_ALLOW', '127.0.0.1');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  await getDb().linkPreview.deleteMany();
  server.hits.clear();
});

// getDb() worker DB'si hazır olunca (test gövdesinde) çağrılsın diye getter.
const deps = {
  get db() {
    return getDb();
  },
  logger: silent,
  now: (): Date => T0,
};

describe('getOrFetchPreview', () => {
  it('çeker, DTO döner ve 24 saatlik kayıt yazar', async () => {
    const url = `${server.origin}/haber?utm_source=x#a`;
    const preview = await getOrFetchPreview(url, deps);

    expect(preview).toEqual({
      url: `${server.origin}/haber`,
      host: '127.0.0.1',
      siteName: 'Örnek',
      title: 'THYAO & filo',
      description: 'Açıklama',
    });
    const row = await getDb().linkPreview.findUniqueOrThrow({
      where: { urlHash: previewUrlHash(`${server.origin}/haber`) },
    });
    expect(row).toMatchObject({ status: 'ok', finalUrl: `${server.origin}/haber` });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(PREVIEW_TTL_MS.ok);
  });

  it('aynı URL ikinci kez ağdan çekilmez (normalleştirilmiş anahtar)', async () => {
    await getOrFetchPreview(`${server.origin}/haber`, deps);
    const second = await getOrFetchPreview(`${server.origin}/haber?fbclid=1#x`, deps);
    expect(second?.title).toBe('THYAO & filo');
    expect(server.hits.get('/haber')).toBe(1);
  });

  it('süresi dolan kayıt yeniden çekilir ve güncellenir', async () => {
    await getOrFetchPreview(`${server.origin}/haber`, deps);
    const later = new Date(T0.getTime() + PREVIEW_TTL_MS.ok + 1);
    await getOrFetchPreview(`${server.origin}/haber`, { ...deps, now: () => later });
    expect(server.hits.get('/haber')).toBe(2);
    expect(await getDb().linkPreview.count()).toBe(1);
  });

  it.each([
    ['/basliksiz', 'failed'],
    ['/json', 'failed'],
    ['/to-private', 'blocked'],
  ] as const)('%s → null, %s olarak 1 saat önbellekte', async (path, status) => {
    expect(await getOrFetchPreview(`${server.origin}${path}`, deps)).toBeNull();
    expect(await getOrFetchPreview(`${server.origin}${path}`, deps)).toBeNull();
    expect(server.hits.get(path)).toBe(1);
    const row = await getDb().linkPreview.findFirstOrThrow();
    expect(row).toMatchObject({ status, title: null, description: null });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(PREVIEW_TTL_MS.failed);
  });

  it('normalize edilemeyen URL (kullanıcı bilgili) → null, istek ve kayıt yok', async () => {
    expect(await getOrFetchPreview('https://user:pw@example.com/', deps)).toBeNull();
    expect(await getDb().linkPreview.count()).toBe(0);
  });

  it('allowlist yoksa yerel adres engellenir (üretim davranışı)', async () => {
    vi.stubEnv('SAFE_FETCH_TEST_ALLOW', '');
    expect(await getOrFetchPreview(`${server.origin}/haber`, deps)).toBeNull();
    expect(server.hits.get('/haber')).toBeUndefined();
    expect((await getDb().linkPreview.findFirstOrThrow()).status).toBe('blocked');
  });
});

describe('getOrFetchPreview — yönlendirme ve host', () => {
  it('bit.ly → kotu.com (başka site) önizlenmez: null, blocked, hedef çekilmez', async () => {
    const preview = await getOrFetchPreview(`http://bit.ly:${server.port}/kisa`, {
      ...deps,
      fetchOptions: { resolve: localDns('bit.ly', 'kotu.com') },
    });
    expect(preview).toBeNull();
    expect(server.hits.get('/haber')).toBeUndefined();
    expect(await getDb().linkPreview.findFirstOrThrow()).toMatchObject({
      status: 'blocked',
      title: null,
    });
  });

  it('aynı site içi yönlendirmede host son adresten (finalUrl) gelir; link kanonik URL', async () => {
    const preview = await getOrFetchPreview(`http://ornek.com.tr:${server.port}/eski`, {
      ...deps,
      fetchOptions: { resolve: localDns('ornek.com.tr', 'haber.ornek.com.tr') },
    });
    expect(preview).toMatchObject({
      url: `http://ornek.com.tr:${server.port}/eski`,
      host: 'haber.ornek.com.tr',
      title: 'THYAO & filo',
    });
  });
});

describe('getOrFetchPreview — iç linkler', () => {
  it('üretim alan adı (borsaliyorum.com) çekilmez ve kaydedilmez', async () => {
    expect(await getOrFetchPreview('https://www.borsaliyorum.com/gonderi/1', deps)).toBeNull();
    expect(await getDb().linkPreview.count()).toBe(0);
  });

  it('NEXT_PUBLIC_SITE_URL host’u iç sayılır', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://onizleme.borsaliyorum.app');
    expect(getOwnHosts()).toEqual(['borsaliyorum.com', 'onizleme.borsaliyorum.app']);
    expect(await getOrFetchPreview('https://onizleme.borsaliyorum.app/gonderi/1', deps)).toBeNull();
    expect(await getDb().linkPreview.count()).toBe(0);
  });

  it('deps.ownHosts env’i geçersiz kılar', async () => {
    const preview = await getOrFetchPreview(`${server.origin}/haber`, {
      ...deps,
      ownHosts: ['127.0.0.1'],
    });
    expect(preview).toBeNull();
    expect(server.hits.get('/haber')).toBeUndefined();
  });
});

describe('getOrFetchPreview — eşzamanlılık', () => {
  it('aynı URL için eşzamanlı çağrılar tek fetch’e iner, hepsi aynı sonucu alır', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        getOrFetchPreview(`${server.origin}/yavas?utm_source=${i}`, deps)
      )
    );
    expect(server.hits.get('/yavas')).toBe(1);
    expect(new Set(results.map(r => r?.title))).toEqual(new Set(['THYAO & filo']));
    expect(await getDb().linkPreview.count()).toBe(1);
  });

  it('iş bitince yeniden çağrılabilir (bekleyen iş haritada kalmaz)', async () => {
    await getOrFetchPreview(`${server.origin}/yavas`, deps);
    const later = new Date(T0.getTime() + PREVIEW_TTL_MS.ok + 1);
    await getOrFetchPreview(`${server.origin}/yavas`, { ...deps, now: () => later });
    expect(server.hits.get('/yavas')).toBe(2);
  });

  it('fetch sürerken başka instance ok yazarsa, gelen failed sonuç onu ezmez', async () => {
    const url = `${server.origin}/yavas-404`;
    const pending = getOrFetchPreview(url, deps);
    // Başka bir instance aynı URL'yi başarıyla önizleyip yazmış olsun (fetch sürerken).
    await new Promise(resolve => setTimeout(resolve, 50));
    await getDb().linkPreview.create({
      data: {
        urlHash: previewUrlHash(url),
        url,
        finalUrl: url,
        status: 'ok',
        title: 'Diğer instance',
        fetchedAt: T0,
        expiresAt: new Date(T0.getTime() + PREVIEW_TTL_MS.ok),
      },
    });

    expect(await pending).toMatchObject({ title: 'Diğer instance' });
    expect(server.hits.get('/yavas-404')).toBe(1);
    const row = await getDb().linkPreview.findUniqueOrThrow({
      where: { urlHash: previewUrlHash(url) },
    });
    expect(row).toMatchObject({ status: 'ok', title: 'Diğer instance' });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(PREVIEW_TTL_MS.ok);
  });

  it('süresi dolmuş ok kaydı başarısız yeniden çekimde korunur; yalnızca deneme ertelenir', async () => {
    const url = `${server.origin}/to-private`;
    await getDb().linkPreview.create({
      data: {
        urlHash: previewUrlHash(url),
        url,
        finalUrl: url,
        status: 'ok',
        title: 'Eski başlık',
        fetchedAt: new Date(T0.getTime() - PREVIEW_TTL_MS.ok - 1),
        expiresAt: new Date(T0.getTime() - 1),
      },
    });

    expect(await getOrFetchPreview(url, deps)).toMatchObject({ title: 'Eski başlık' });
    const row = await getDb().linkPreview.findUniqueOrThrow({
      where: { urlHash: previewUrlHash(url) },
    });
    expect(row).toMatchObject({ status: 'ok', title: 'Eski başlık' });
    expect(row.expiresAt.getTime() - T0.getTime()).toBe(PREVIEW_TTL_MS.failed);
  });

  it('failed kaydı süresi dolunca ok ile değiştirilir', async () => {
    const url = `${server.origin}/haber`;
    await getDb().linkPreview.create({
      data: {
        urlHash: previewUrlHash(url),
        url,
        status: 'failed',
        fetchedAt: new Date(T0.getTime() - PREVIEW_TTL_MS.failed - 1),
        expiresAt: new Date(T0.getTime() - 1),
      },
    });
    expect(await getOrFetchPreview(url, deps)).toMatchObject({ title: 'THYAO & filo' });
    expect(await getDb().linkPreview.findFirstOrThrow()).toMatchObject({ status: 'ok' });
  });
});
