import 'server-only';

import { promises as dnsPromises, type LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';

import { Agent, request } from 'undici';

import type { Logger } from '@/lib/logger';

import { ipLiteralOf, isBlockedHostname, isPublicAddress } from './ip-policy';
import { isSameSite } from './site';

/**
 * Kullanıcının verdiği URL'yi sunucudan güvenle çeker (ADR-0002 Karar 6). Kurallar:
 * yalnızca http/https, port 80/443, kullanıcı bilgisi yok; host'un **tüm** DNS adresleri genel
 * unicast olmalı; DNS tek kez çözülür ve bağlantı yalnızca doğrulanan bu adreslere açılır
 * (`connect.lookup` pinleme: DNS rebinding için ikinci çözüm yok); yönlendirmeler elle, en fazla
 * 3, her adım baştan doğrulanır ve kayıtlı alan adını (eTLD+1) değiştiren yönlendirme engellenir;
 * toplam süre (DNS dahil) 3 sn, gövde 512 KB, yalnızca `text/html`.
 */

export const SAFE_FETCH_DEFAULTS = {
  timeoutMs: 3_000,
  maxBytes: 512 * 1024,
  maxRedirects: 3,
} as const;

export const SAFE_FETCH_USER_AGENT = 'BorsaliyorumBot/1.0 (+https://borsaliyorum.com/bot)';

const ALLOWED_PORTS = new Set([80, 443]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const BLOCKED_ERROR_CODE = 'ESAFEFETCHBLOCKED';

/** Politika ihlali → `blocked`; ağ/sunucu kaynaklı başarısızlık → `failed`. */
export const SafeFetchReason = {
  INVALID_URL: 'invalid_url',
  PROTOCOL: 'protocol',
  CREDENTIALS: 'credentials',
  PORT: 'port',
  HOSTNAME: 'hostname',
  ADDRESS: 'address',
  TOO_MANY_REDIRECTS: 'too_many_redirects',
  CROSS_SITE_REDIRECT: 'cross_site_redirect',
  DNS: 'dns',
  TIMEOUT: 'timeout',
  NETWORK: 'network',
  HTTP_STATUS: 'http_status',
  CONTENT_TYPE: 'content_type',
  REDIRECT_LOCATION: 'redirect_location',
} as const;
export type SafeFetchReason = (typeof SafeFetchReason)[keyof typeof SafeFetchReason];

export type SafeFetchFailure = {
  readonly ok: false;
  readonly kind: 'blocked' | 'failed';
  readonly reason: SafeFetchReason;
};
export type SafeFetchSuccess<T> = {
  readonly ok: true;
  readonly finalUrl: string;
  readonly value: T;
};
export type SafeFetchResult<T> = SafeFetchSuccess<T> | SafeFetchFailure;

/**
 * Host'u A/AAAA adreslerine çözer. `signal` toplam zaman aşımında tetiklenir; uygulama sorguyu
 * iptal etmelidir. safeFetch ayrıca sinyalle yarıştırır: asılı kalan bir resolver da süreyi
 * aşamaz. Testlerde sahte DNS için değiştirilir.
 */
export type Resolver = (hostname: string, signal: AbortSignal) => Promise<readonly LookupAddress[]>;

export type SafeFetchOptions = {
  /** Verilmezse `createSystemResolver({ timeoutMs })`. */
  readonly resolve?: Resolver;
  /**
   * Yalnızca testler: bu IP'ler politika dışı tutulur ve her porta izin verilir (yerel test
   * sunucusu). Üretimde boş olmalı; env kaynağı `getSafeFetchTestAllow()` bunu zorlar.
   */
  readonly allowAddresses?: readonly string[];
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  readonly maxRedirects?: number;
  /**
   * Kayıtlı alan adını (eTLD+1) değiştiren yönlendirmelere izin ver. Varsayılan false: kısa link
   * (bit.ly → başka site) önizlemede kaynağı yanıltıcı gösterirdi.
   */
  readonly allowCrossSiteRedirects?: boolean;
  /** Beklenen (kullanıcı girdisi kaynaklı) hatalar debug seviyesinde loglanır. */
  readonly logger?: Logger;
};

export type SafeFetchBody = {
  readonly finalUrl: string;
  /** `Content-Type` başlığındaki `charset`, küçük harfli; yoksa null. */
  readonly charset: string | null;
  /** En fazla `maxBytes` bayt; okuyucu erken durursa (`break`) bağlantı kapatılır. */
  readonly chunks: AsyncIterable<Uint8Array>;
};

const failure = (kind: SafeFetchFailure['kind'], reason: SafeFetchReason): SafeFetchFailure => ({
  ok: false,
  kind,
  reason,
});

const errorCodeOf = (error: unknown): string | undefined =>
  error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;

export type SystemResolverOptions = {
  /** Sorgu başına c-ares zaman aşımı; toplam süre ayrıca `signal` ile sınırlıdır. */
  readonly timeoutMs: number;
  /** Yalnızca testler: sistem DNS sunucuları yerine bunlar (`ip:port`). */
  readonly servers?: readonly string[];
};

/**
 * c-ares tabanlı çözücü (`dns.promises.Resolver`): libuv threadpool'unu kullanmaz (yavaş DNS
 * diğer `fs`/`crypto` işlerini bekletmez) ve `cancel()` ile gerçekten iptal edilir.
 * `dns.lookup`'ın aksine /etc/hosts okumaz; önizleme yalnızca genel DNS adlarıyla çalışır.
 */
export const createSystemResolver =
  ({ timeoutMs, servers }: SystemResolverOptions): Resolver =>
  async (hostname, signal) => {
    const resolver = new dnsPromises.Resolver({ timeout: timeoutMs, tries: 1 });
    if (servers) resolver.setServers([...servers]);
    const cancel = (): void => resolver.cancel();
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
    try {
      const [a, aaaa] = await Promise.allSettled([
        resolver.resolve4(hostname),
        resolver.resolve6(hostname),
      ]);
      const addresses: LookupAddress[] = [
        ...(a.status === 'fulfilled' ? a.value.map(address => ({ address, family: 4 })) : []),
        ...(aaaa.status === 'fulfilled' ? aaaa.value.map(address => ({ address, family: 6 })) : []),
      ];
      if (addresses.length > 0) return addresses;
      if (a.status === 'rejected') throw a.reason;
      throw Object.assign(new Error(`safe-fetch: no address for ${hostname}`), {
        code: 'ENODATA',
      });
    } finally {
      signal.removeEventListener('abort', cancel);
    }
  };

/** `promise`'i sinyalle yarıştırır: sinyal tetiklenince hemen `signal.reason` ile reddeder. */
const raceSignal = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = (): void => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });

type AddressPolicy = {
  readonly resolve: Resolver;
  readonly allow: ReadonlySet<string>;
};

const isAcceptable = (policy: AddressPolicy, ip: string): boolean =>
  policy.allow.has(ip) || isPublicAddress(ip);

/** IP literal için `addresses` null'dır (soket DNS'siz, doğrudan o adrese açılır). */
type TargetCheck =
  { readonly ok: true; readonly addresses: readonly LookupAddress[] | null } | SafeFetchFailure;

type CheckContext = {
  readonly policy: AddressPolicy;
  readonly signal: AbortSignal;
  readonly log: Logger | undefined;
};

/** Tek bir hedefi (ilk URL ya da yönlendirme) bağlantı açmadan doğrular. */
const checkTarget = async (url: URL, ctx: CheckContext): Promise<TargetCheck> => {
  const { policy } = ctx;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return failure('blocked', SafeFetchReason.PROTOCOL);
  }
  if (url.username !== '' || url.password !== '') {
    return failure('blocked', SafeFetchReason.CREDENTIALS);
  }
  const port = url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port);
  const portAllowed = ALLOWED_PORTS.has(port);

  const literal = ipLiteralOf(url.hostname);
  let resolved: readonly LookupAddress[] | null = null;
  let ips: readonly string[];
  if (literal !== null) {
    ips = [literal];
  } else {
    if (isBlockedHostname(url.hostname)) return failure('blocked', SafeFetchReason.HOSTNAME);
    // Gereksiz DNS sorgusu olmasın: üretimde (allowlist boş) port kuralı önce.
    if (!portAllowed && policy.allow.size === 0) return failure('blocked', SafeFetchReason.PORT);
    try {
      resolved = await raceSignal(policy.resolve(url.hostname, ctx.signal), ctx.signal);
    } catch (error) {
      if (ctx.signal.aborted) return failure('failed', SafeFetchReason.TIMEOUT);
      // NXDOMAIN vb. kullanıcı girdisinin olağan sonucu; hata değil, sonuçtur.
      ctx.log?.debug('safe-fetch dns failed', { host: url.hostname, code: errorCodeOf(error) });
      return failure('failed', SafeFetchReason.DNS);
    }
    if (resolved.length === 0) return failure('failed', SafeFetchReason.DNS);
    ips = resolved.map(a => a.address);
  }

  if (!ips.every(ip => isAcceptable(policy, ip))) {
    return failure('blocked', SafeFetchReason.ADDRESS);
  }
  const allAllowlisted = ips.every(ip => policy.allow.has(ip));
  if (!portAllowed && !allAllowlisted) return failure('blocked', SafeFetchReason.PORT);
  return { ok: true, addresses: resolved };
};

const blockedLookupError = (hostname: string): NodeJS.ErrnoException =>
  Object.assign(new Error(`safe-fetch: blocked address for ${hostname}`), {
    code: BLOCKED_ERROR_CODE,
  });

/**
 * Soket yalnızca `checkTarget`'ın doğruladığı adreslere açılır: lookup DNS'e gitmez, pinlenen
 * listeyi döner. Doğrulama ile bağlantı arasında ikinci bir çözüm (DNS rebinding penceresi)
 * yoktur. Pinlenmemiş bir host'a bağlantı denemesi engellenir.
 */
const pinnedLookup =
  (pinned: ReadonlyMap<string, readonly LookupAddress[]>): LookupFunction =>
  (hostname, options, callback) => {
    const addresses = pinned.get(hostname);
    const first = addresses?.[0];
    if (!addresses || !first) {
      callback(blockedLookupError(hostname), '');
      return;
    }
    if (options.all === true) callback(null, [...addresses]);
    else callback(null, first.address, first.family);
  };

const hasCode = (error: unknown, code: string): boolean => {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    if ((current as NodeJS.ErrnoException).code === code) return true;
    if (current instanceof AggregateError && current.errors.some(e => hasCode(e, code))) {
      return true;
    }
    current = current.cause;
  }
  return false;
};

/**
 * Okunmayacak gövdeyi bırakır. `destroy()` bitmemiş gövdede `RequestAbortedError` yayar;
 * bu beklenen bir kapanıştır, işlenmemiş hata olarak süreci düşürmemeli.
 */
const discard = (body: Readable, log: Logger | undefined): void => {
  body.on('error', (error: unknown) => {
    // Bilinçli kapatma; sonuç zaten belirlendi.
    log?.debug('safe-fetch body discarded', { code: errorCodeOf(error) });
  });
  body.destroy();
};

const headerValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseContentType = (
  value: string | undefined
): { mediaType: string; charset: string | null } => {
  const [type = '', ...params] = (value ?? '').split(';');
  const charsetParam = params.map(p => p.trim()).find(p => p.toLowerCase().startsWith('charset='));
  const charset = charsetParam
    ? charsetParam.slice('charset='.length).replace(/^"|"$/g, '').trim().toLowerCase()
    : null;
  return { mediaType: type.trim().toLowerCase(), charset: charset === '' ? null : charset };
};

async function* limitBytes(
  source: AsyncIterable<Uint8Array>,
  maxBytes: number
): AsyncGenerator<Uint8Array, void, undefined> {
  let received = 0;
  for await (const chunk of source) {
    const remaining = maxBytes - received;
    if (chunk.byteLength >= remaining) {
      if (remaining > 0) yield chunk.subarray(0, remaining);
      // Sınıra ulaşıldı: geri kalanı indirilmez (for-await çıkışı akışı yok eder).
      return;
    }
    received += chunk.byteLength;
    yield chunk;
  }
}

/**
 * `rawUrl`'yi güvenle çeker ve `text/html` gövdesini `read`'e verir. `read` toplam zaman
 * aşımının içinde çalışır; döndürdüğü değer `value` olarak gelir. Ağ/politika hataları
 * `SafeFetchFailure` olarak döner; `read`'in kendi (beklenmeyen) hataları yeniden fırlatılır.
 */
export const safeFetchHtml = async <T>(
  rawUrl: string,
  read: (body: SafeFetchBody) => Promise<T>,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> => {
  const timeoutMs = options.timeoutMs ?? SAFE_FETCH_DEFAULTS.timeoutMs;
  const maxBytes = options.maxBytes ?? SAFE_FETCH_DEFAULTS.maxBytes;
  const maxRedirects = options.maxRedirects ?? SAFE_FETCH_DEFAULTS.maxRedirects;
  const policy: AddressPolicy = {
    resolve: options.resolve ?? createSystemResolver({ timeoutMs }),
    allow: new Set(options.allowAddresses ?? []),
  };
  const log = options.logger;

  let origin: URL;
  try {
    origin = new URL(rawUrl);
  } catch {
    // Geçersiz URL kullanıcı girdisidir; hata değil, sonuçtur. İçeriği loglanmaz.
    log?.debug('safe-fetch invalid url');
    return failure('blocked', SafeFetchReason.INVALID_URL);
  }

  // Zaman aşımı DNS'ten itibaren her şeyi kapsar: çözüm, bağlantı, başlıklar, gövde okuma.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const ctx: CheckContext = { policy, signal: controller.signal, log };
  const pinned = new Map<string, readonly LookupAddress[]>();
  const agent = new Agent({
    connect: { lookup: pinnedLookup(pinned), timeout: timeoutMs },
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
    allowH2: false,
  });

  let current = origin;
  try {
    for (let hop = 0; ; hop += 1) {
      const check = await checkTarget(current, ctx);
      if (!check.ok) return check;
      if (check.addresses) pinned.set(current.hostname, check.addresses);

      const response = await request(current, {
        dispatcher: agent,
        method: 'GET',
        signal: controller.signal,
        headers: {
          'user-agent': SAFE_FETCH_USER_AGENT,
          accept: 'text/html',
          'accept-language': 'tr,en;q=0.8',
          // Sıkıştırılmış gövde istenmez: boyut sınırı aktarılan baytla birebir olsun.
          'accept-encoding': 'identity',
        },
      });

      if (REDIRECT_STATUSES.has(response.statusCode)) {
        discard(response.body, log);
        if (hop >= maxRedirects) return failure('blocked', SafeFetchReason.TOO_MANY_REDIRECTS);
        const location = headerValue(response.headers.location);
        if (!location) return failure('failed', SafeFetchReason.REDIRECT_LOCATION);
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          // Bozuk Location başlığı uzak sunucu kaynaklı; sonuç olarak döner.
          log?.debug('safe-fetch bad redirect location', { host: current.hostname });
          return failure('failed', SafeFetchReason.REDIRECT_LOCATION);
        }
        // İlk URL'nin sitesiyle karşılaştırılır: zincirin ortasında başka siteye geçiş de sayılır.
        if (!options.allowCrossSiteRedirects && !isSameSite(origin.hostname, next.hostname)) {
          return failure('blocked', SafeFetchReason.CROSS_SITE_REDIRECT);
        }
        current = next;
        continue;
      }

      if (response.statusCode < 200 || response.statusCode > 299) {
        discard(response.body, log);
        return failure('failed', SafeFetchReason.HTTP_STATUS);
      }

      const { mediaType, charset } = parseContentType(
        headerValue(response.headers['content-type'])
      );
      if (mediaType !== 'text/html') {
        discard(response.body, log);
        return failure('failed', SafeFetchReason.CONTENT_TYPE);
      }

      const finalUrl = current.href;
      try {
        const value = await read({
          finalUrl,
          charset,
          chunks: limitBytes(response.body, maxBytes),
        });
        return { ok: true, finalUrl, value };
      } finally {
        discard(response.body, log);
      }
    }
  } catch (error) {
    if (controller.signal.aborted) return failure('failed', SafeFetchReason.TIMEOUT);
    if (hasCode(error, BLOCKED_ERROR_CODE)) return failure('blocked', SafeFetchReason.ADDRESS);
    if (isNetworkError(error)) return failure('failed', SafeFetchReason.NETWORK);
    throw error;
  } finally {
    clearTimeout(timer);
    agent.destroy().catch((error: unknown) => {
      // Kapanış hatası yalnızca zaten kopmuş soketleri ifade eder; sonucu etkilemez.
      log?.debug('safe-fetch agent close failed', { code: errorCodeOf(error) });
    });
  }
};

// undici hataları `UND_ERR_*`, Node soket/DNS hataları `E*` kodu taşır.
const isNetworkError = (error: unknown): boolean => {
  const code = errorCodeOf(error);
  return typeof code === 'string' && (code.startsWith('UND_ERR') || /^E[A-Z]+$/.test(code));
};
