import { createSocket } from 'node:dgram';
import type { LookupAddress } from 'node:dns';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  html,
  redirect,
  startTestHttpServer,
  type TestHttpServer,
} from '@tests/utils/test-http-server';

import {
  createSystemResolver,
  SAFE_FETCH_DEFAULTS,
  SAFE_FETCH_USER_AGENT,
  safeFetchHtml,
  type Resolver,
  type SafeFetchBody,
  type SafeFetchOptions,
} from './safe-fetch';

const v4 = (address: string): LookupAddress => ({ address, family: 4 });
const v6 = (address: string): LookupAddress => ({ address, family: 6 });

/** Sahte DNS: host → adresler. Listede olmayan host NXDOMAIN. */
const fakeDns = (
  table: Record<string, readonly LookupAddress[]>
): Resolver & { calls: string[] } => {
  const calls: string[] = [];
  const resolve = async (hostname: string): Promise<readonly LookupAddress[]> => {
    calls.push(hostname);
    const entry = table[hostname];
    if (!entry) throw Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' });
    return entry;
  };
  return Object.assign(resolve, { calls });
};

const readText = async (body: SafeFetchBody): Promise<string> => {
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of body.chunks) text += decoder.decode(chunk, { stream: true });
  return text + decoder.decode();
};

const countBytes = async (body: SafeFetchBody): Promise<number> => {
  let total = 0;
  for await (const chunk of body.chunks) total += chunk.byteLength;
  return total;
};

describe('safeFetchHtml — bağlantı açmadan engellenenler', () => {
  // Sahte DNS'te genel bir adrese çözülen tek host; diğerleri ya özel adrese ya da NXDOMAIN.
  const dns = fakeDns({
    'foo.com': [v4('93.184.216.34')],
    '127.0.0.1.nip.io': [v4('127.0.0.1')],
    'mixed.example.com': [v4('93.184.216.34'), v4('10.0.0.5')],
    'v6local.example.com': [v6('fd00::1')],
    'mapped.example.com': [v6('::ffff:169.254.169.254')],
    'metadata.google.internal': [v4('169.254.169.254')],
    'localhost.localdomain': [v4('127.0.0.1')],
  });
  const opts: SafeFetchOptions = { resolve: dns };
  const read = vi.fn(readText);

  it.each([
    ['http://127.0.0.1/', 'address'],
    ['http://127.1/', 'address'],
    ['http://0x7f.0.0.1/', 'address'],
    ['http://0177.0.0.1/', 'address'],
    ['http://2130706433/', 'address'],
    ['http://0.0.0.0/', 'address'],
    ['http://169.254.169.254/latest/meta-data/', 'address'],
    ['http://10.0.0.1:6379/', 'address'],
    ['http://100.64.0.1/', 'address'],
    ['http://192.168.1.1/', 'address'],
    ['http://224.0.0.1/', 'address'],
    ['http://[::1]/', 'address'],
    ['http://[fd00::1]/', 'address'],
    ['http://[fe80::1]/', 'address'],
    ['http://[::ffff:127.0.0.1]/', 'address'],
    ['http://[::ffff:169.254.169.254]/', 'address'],
    ['http://[::]/', 'address'],
    ['http://foo.com:22/', 'port'],
    ['https://foo.com:8443/', 'port'],
    ['http://metadata.google.internal/computeMetadata/v1/', 'hostname'],
    ['http://localhost.localdomain/', 'hostname'],
    ['http://localhost/', 'hostname'],
    ['http://localhost:3000/', 'hostname'],
    ['http://127.0.0.1.nip.io/', 'address'],
    ['http://mixed.example.com/', 'address'],
    ['http://v6local.example.com/', 'address'],
    ['http://mapped.example.com/', 'address'],
    ['http://user:pass@foo.com/', 'credentials'],
    ['http://user@foo.com/', 'credentials'],
    ['ftp://foo.com/', 'protocol'],
    ['file:///etc/passwd', 'protocol'],
    ['gopher://foo.com:70/', 'protocol'],
    ['javascript:alert(1)', 'protocol'],
    ['not a url', 'invalid_url'],
  ])('%s → blocked (%s)', async (url, reason) => {
    const result = await safeFetchHtml(url, read, opts);
    expect(result).toEqual({ ok: false, kind: 'blocked', reason });
    expect(read).not.toHaveBeenCalled();
  });

  it('port kuralı DNS sorgusundan önce uygulanır', async () => {
    dns.calls.length = 0;
    await safeFetchHtml('http://foo.com:22/', read, opts);
    expect(dns.calls).toEqual([]);
  });

  it('çözülemeyen host → failed (dns)', async () => {
    const result = await safeFetchHtml('https://yok.example.com/', read, opts);
    expect(result).toEqual({ ok: false, kind: 'failed', reason: 'dns' });
  });

  it('yavaş DNS toplam süreye dahil: timeoutMs aşılınca failed (timeout), sinyal iptal eder', async () => {
    let received: AbortSignal | undefined;
    const hanging: Resolver = async (_hostname, signal) => {
      received = signal;
      // Hiç cevap vermeyen DNS (sinyali yok sayan kötü bir resolver da süreyi aşamaz).
      return new Promise<never>(() => undefined);
    };
    const started = Date.now();
    const result = await safeFetchHtml('https://yavas.example.com/', read, {
      resolve: hanging,
      timeoutMs: 100,
    });
    expect(result).toEqual({ ok: false, kind: 'failed', reason: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(received?.aborted).toBe(true);
    expect(read).not.toHaveBeenCalled();
  });

  it('sonunda cevap veren ama süreyi aşan DNS de timeout olur (sonuç beklenmez)', async () => {
    const slow: Resolver = async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return [v4('10.0.0.1')];
    };
    const result = await safeFetchHtml('https://yavas.example.com/', read, {
      resolve: slow,
      timeoutMs: 100,
    });
    expect(result).toEqual({ ok: false, kind: 'failed', reason: 'timeout' });
  });

  it('varsayılan sınırlar ADR-0002 ile aynı', () => {
    expect(SAFE_FETCH_DEFAULTS).toEqual({ timeoutMs: 3000, maxBytes: 512 * 1024, maxRedirects: 3 });
  });
});

describe('safeFetchHtml — yerel test sunucusu (127.0.0.1 bilinçli allowlist)', () => {
  let server: TestHttpServer;
  // Yalnızca test sunucusunun adresi politika dışı; diğer her şey üretim kurallarıyla.
  const allow: SafeFetchOptions = { allowAddresses: ['127.0.0.1'] };

  beforeAll(async () => {
    server = await startTestHttpServer();
    server.route('/ok', html('<html><head><title>Merhaba</title></head></html>'));
    server.route('/json', html('{"a":1}', { contentType: 'application/json' }));
    server.route('/png', html('x', { contentType: 'image/png' }));
    server.route('/no-type', (_req, res) => {
      res.writeHead(200);
      res.end('<title>x</title>');
    });
    server.route('/404', html('<title>yok</title>', { status: 404 }));
    server.route('/to-private', redirect('http://10.0.0.1:6379/'));
    server.route('/to-metadata', redirect('http://169.254.169.254/latest/meta-data/', 301));
    server.route('/to-mapped', redirect('http://[::ffff:127.0.0.1]/'));
    server.route('/to-host', redirect('http://internal.example.com/'));
    server.route('/kisa', redirect(`http://kotu.com:${server.port}/hedef`));
    server.route('/hedef', html('<title>kötü</title>'));
    server.route('/eski', redirect(`http://haber.ornek.com.tr:${server.port}/ok`, 301));
    server.route('/to-sub-private', redirect('http://ic.ornek.com.tr/'));
    server.route('/to-ftp', redirect('ftp://foo.com/'));
    server.route('/no-location', (_req, res) => {
      res.writeHead(302);
      res.end();
    });
    for (let i = 1; i <= 4; i += 1) server.route(`/r${i}`, redirect(`/r${i + 1}`, 307));
    server.route('/r5', html('<title>son</title>'));
    server.route('/hang', () => {
      // Hiç cevap vermez: zaman aşımını test eder.
    });
    server.route('/drip', (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.write('<html><head>');
      // Gövde hiç bitmez.
    });
    const big = `<html><head><title>büyük</title>${'x'.repeat(2 * 1024 * 1024)}`;
    server.route('/big', html(big));
    server.route(
      '/charset',
      html('<title>Şirket</title>', { contentType: 'text/html; charset="UTF-8"' })
    );
  });

  afterAll(async () => {
    await server.close();
  });

  it('text/html gövdesini okur; sabit UA gönderir, çerez/yetki başlığı göndermez', async () => {
    const result = await safeFetchHtml(`${server.origin}/ok`, readText, allow);
    expect(result).toEqual({
      ok: true,
      finalUrl: `${server.origin}/ok`,
      value: '<html><head><title>Merhaba</title></head></html>',
    });
    expect(server.lastHeaders?.['user-agent']).toBe(SAFE_FETCH_USER_AGENT);
    expect(server.lastHeaders?.cookie).toBeUndefined();
    expect(server.lastHeaders?.authorization).toBeUndefined();
    expect(server.lastHeaders?.['accept-encoding']).toBe('identity');
  });

  it('allowlist yoksa yerel sunucu da engellenir', async () => {
    const result = await safeFetchHtml(`${server.origin}/ok`, readText);
    expect(result).toEqual({ ok: false, kind: 'blocked', reason: 'address' });
  });

  it('Content-Type charset parametresini okuyucuya verir', async () => {
    const result = await safeFetchHtml(`${server.origin}/charset`, async b => b.charset, allow);
    expect(result).toMatchObject({ ok: true, value: 'utf-8' });
  });

  it.each([
    ['/json', 'content_type'],
    ['/png', 'content_type'],
    ['/no-type', 'content_type'],
    ['/404', 'http_status'],
    ['/no-location', 'redirect_location'],
  ])('%s → failed (%s)', async (path, reason) => {
    const read = vi.fn(readText);
    const result = await safeFetchHtml(`${server.origin}${path}`, read, allow);
    expect(result).toEqual({ ok: false, kind: 'failed', reason });
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    ['/to-private', 'address'],
    ['/to-metadata', 'address'],
    ['/to-mapped', 'address'],
    ['/to-host', 'address'],
    ['/to-ftp', 'protocol'],
  ])('yönlendirme her adımda yeniden doğrulanır: %s → blocked (%s)', async (path, reason) => {
    const dns = fakeDns({ 'internal.example.com': [v4('192.168.0.10')] });
    // Adres kuralını site kuralından bağımsız sınamak için siteler arası yönlendirme açık.
    const result = await safeFetchHtml(`${server.origin}${path}`, readText, {
      ...allow,
      resolve: dns,
      allowCrossSiteRedirects: true,
    });
    expect(result).toEqual({ ok: false, kind: 'blocked', reason });
  });

  it('varsayılan: başka siteye (eTLD+1) yönlendirme → blocked (cross_site_redirect)', async () => {
    const dns = fakeDns({ 'internal.example.com': [v4('192.168.0.10')] });
    const result = await safeFetchHtml(`${server.origin}/to-host`, readText, {
      ...allow,
      resolve: dns,
    });
    expect(result).toEqual({ ok: false, kind: 'blocked', reason: 'cross_site_redirect' });
    expect(dns.calls).toEqual([]);
  });

  it('kısa link başka siteye gidiyorsa (bit.ly → kotu.com) hedef hiç çekilmez', async () => {
    const dns = fakeDns({ 'bit.ly': [v4('127.0.0.1')], 'kotu.com': [v4('127.0.0.1')] });
    const result = await safeFetchHtml(`http://bit.ly:${server.port}/kisa`, readText, {
      ...allow,
      resolve: dns,
    });
    expect(result).toEqual({ ok: false, kind: 'blocked', reason: 'cross_site_redirect' });
    expect(server.hits.get('/hedef')).toBeUndefined();
    expect(dns.calls).toEqual(['bit.ly']);
  });

  it('aynı site içi yönlendirme izinli; finalUrl son adres, her host bir kez çözülür', async () => {
    const dns = fakeDns({
      'ornek.com.tr': [v4('127.0.0.1')],
      'haber.ornek.com.tr': [v4('127.0.0.1')],
    });
    const result = await safeFetchHtml(`http://ornek.com.tr:${server.port}/eski`, readText, {
      ...allow,
      resolve: dns,
    });
    expect(result).toMatchObject({
      ok: true,
      finalUrl: `http://haber.ornek.com.tr:${server.port}/ok`,
    });
    expect(dns.calls).toEqual(['ornek.com.tr', 'haber.ornek.com.tr']);
  });

  it('aynı site içinde özel adrese yönlendirme yine engellenir', async () => {
    const dns = fakeDns({
      'ornek.com.tr': [v4('127.0.0.1')],
      'ic.ornek.com.tr': [v4('192.168.0.10')],
    });
    const result = await safeFetchHtml(
      `http://ornek.com.tr:${server.port}/to-sub-private`,
      readText,
      { ...allow, resolve: dns }
    );
    expect(result).toEqual({ ok: false, kind: 'blocked', reason: 'address' });
  });

  it('3 yönlendirmeye izin verir', async () => {
    const result = await safeFetchHtml(`${server.origin}/r2`, readText, allow);
    expect(result).toMatchObject({ ok: true, finalUrl: `${server.origin}/r5` });
  });

  it('4. yönlendirme → blocked (too_many_redirects)', async () => {
    const result = await safeFetchHtml(`${server.origin}/r1`, readText, allow);
    expect(result).toEqual({ ok: false, kind: 'blocked', reason: 'too_many_redirects' });
  });

  it('DNS pinleme: host bir kez çözülür, bağlantı doğrulanan adrese açılır (rebinding yok)', async () => {
    let calls = 0;
    const before = server.hits.get('/ok') ?? 0;
    const result = await safeFetchHtml(`http://rebind.example.com:${server.port}/ok`, readText, {
      ...allow,
      // İkinci bir çözüm yapılsaydı özel adres dönerdi; yapılmamalı.
      resolve: async () => {
        calls += 1;
        return calls === 1 ? [v4('127.0.0.1')] : [v4('10.0.0.1')];
      },
    });
    expect(result).toMatchObject({ ok: true, value: expect.stringContaining('Merhaba') });
    expect(calls).toBe(1);
    expect(server.hits.get('/ok')).toBe(before + 1);
  });

  it('gerçek c-ares çözücü: cevap vermeyen DNS sunucusu → timeoutMs içinde failed (timeout)', async () => {
    // UDP soketi paketleri alır ama hiç cevaplamaz: kara delik DNS sunucusu.
    const blackhole = createSocket('udp4');
    await new Promise<void>(resolve => blackhole.bind(0, '127.0.0.1', resolve));
    const { port } = blackhole.address();
    try {
      const started = Date.now();
      const result = await safeFetchHtml('https://yavas.example.com/', readText, {
        // c-ares'in kendi zaman aşımı uzun; iptal toplam süre sinyalinden gelmeli.
        resolve: createSystemResolver({ timeoutMs: 10_000, servers: [`127.0.0.1:${port}`] }),
        timeoutMs: 150,
      });
      expect(result).toEqual({ ok: false, kind: 'failed', reason: 'timeout' });
      expect(Date.now() - started).toBeLessThan(1_500);
    } finally {
      blackhole.close();
    }
  });

  it('gerçek c-ares çözücü: iptal edilen sorgu reddedilir (asılı kalmaz)', async () => {
    const blackhole = createSocket('udp4');
    await new Promise<void>(resolve => blackhole.bind(0, '127.0.0.1', resolve));
    const { port } = blackhole.address();
    try {
      const resolve = createSystemResolver({ timeoutMs: 10_000, servers: [`127.0.0.1:${port}`] });
      const controller = new AbortController();
      const pending = resolve('yavas.example.com', controller.signal);
      setTimeout(() => controller.abort(), 50);
      await expect(pending).rejects.toMatchObject({ code: 'ECANCELLED' });
    } finally {
      blackhole.close();
    }
  });

  it('cevap vermeyen sunucu → failed (timeout), süre sınırı aşılmaz', async () => {
    const started = Date.now();
    const result = await safeFetchHtml(`${server.origin}/hang`, readText, {
      ...allow,
      timeoutMs: 200,
    });
    expect(result).toEqual({ ok: false, kind: 'failed', reason: 'timeout' });
    expect(Date.now() - started).toBeLessThan(1_500);
  });

  it('bitmeyen gövde → failed (timeout); okuma da toplam süreye dahil', async () => {
    const result = await safeFetchHtml(`${server.origin}/drip`, readText, {
      ...allow,
      timeoutMs: 200,
    });
    expect(result).toEqual({ ok: false, kind: 'failed', reason: 'timeout' });
  });

  it('512 KB üstü gövde kesilir (okuyucu en fazla maxBytes görür)', async () => {
    const result = await safeFetchHtml(`${server.origin}/big`, countBytes, allow);
    expect(result).toMatchObject({ ok: true, value: SAFE_FETCH_DEFAULTS.maxBytes });
  });

  it('okuyucunun beklenmeyen hatası yutulmaz', async () => {
    const boom = new TypeError('okuyucu hatası');
    await expect(
      safeFetchHtml(
        `${server.origin}/ok`,
        async () => {
          throw boom;
        },
        allow
      )
    ).rejects.toBe(boom);
  });
});
