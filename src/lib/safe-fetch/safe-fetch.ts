import 'server-only';

import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import type { LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';

import { Agent, request } from 'undici';

import { ipLiteralOf, isBlockedHostname, isPublicAddress } from './ip-policy';

/**
 * Kullanıcının verdiği URL'yi sunucudan güvenle çeker (ADR-0002 Karar 6). Kurallar:
 * yalnızca http/https, port 80/443, kullanıcı bilgisi yok; host'un **tüm** DNS adresleri genel
 * unicast olmalı; bağlantı, `connect.lookup` içinde yeniden çözülüp doğrulanan adrese açılır
 * (DNS rebinding: doğrulama ile bağlantı arasında boşluk yok); yönlendirmeler elle, en fazla 3,
 * her adım baştan doğrulanır; toplam süre 3 sn, gövde 512 KB, yalnızca `text/html`.
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

/** `dns.lookup(host, { all: true })` eşdeğeri; testlerde sahte DNS için değiştirilir. */
export type Resolver = (hostname: string) => Promise<readonly LookupAddress[]>;

export type SafeFetchOptions = {
  readonly resolve?: Resolver;
  /**
   * Yalnızca testler: bu IP'ler politika dışı tutulur ve her porta izin verilir (yerel test
   * sunucusu). Üretimde boş olmalı; env kaynağı `getSafeFetchTestAllow()` bunu zorlar.
   */
  readonly allowAddresses?: readonly string[];
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  readonly maxRedirects?: number;
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

const defaultResolve: Resolver = hostname =>
  new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, order: 'verbatim' }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });

type AddressPolicy = {
  readonly resolve: Resolver;
  readonly allow: ReadonlySet<string>;
};

const isAcceptable = (policy: AddressPolicy, ip: string): boolean =>
  policy.allow.has(ip) || isPublicAddress(ip);

type TargetCheck = { readonly ok: true } | SafeFetchFailure;
const PASS: TargetCheck = { ok: true };

/** Tek bir hedefi (ilk URL ya da yönlendirme) bağlantı açmadan doğrular. */
const checkTarget = async (url: URL, policy: AddressPolicy): Promise<TargetCheck> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return failure('blocked', SafeFetchReason.PROTOCOL);
  }
  if (url.username !== '' || url.password !== '') {
    return failure('blocked', SafeFetchReason.CREDENTIALS);
  }
  const port = url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : Number(url.port);
  const portAllowed = ALLOWED_PORTS.has(port);

  const literal = ipLiteralOf(url.hostname);
  let addresses: readonly string[];
  if (literal !== null) {
    addresses = [literal];
  } else {
    if (isBlockedHostname(url.hostname)) return failure('blocked', SafeFetchReason.HOSTNAME);
    // Gereksiz DNS sorgusu olmasın: üretimde (allowlist boş) port kuralı önce.
    if (!portAllowed && policy.allow.size === 0) return failure('blocked', SafeFetchReason.PORT);
    try {
      addresses = (await policy.resolve(url.hostname)).map(a => a.address);
    } catch {
      // NXDOMAIN vb. kullanıcı girdisinin olağan sonucu; çağıran `failed`/`dns` olarak loglar.
      return failure('failed', SafeFetchReason.DNS);
    }
    if (addresses.length === 0) return failure('failed', SafeFetchReason.DNS);
  }

  if (!addresses.every(ip => isAcceptable(policy, ip))) {
    return failure('blocked', SafeFetchReason.ADDRESS);
  }
  const allAllowlisted = addresses.every(ip => policy.allow.has(ip));
  if (!portAllowed && !allAllowlisted) return failure('blocked', SafeFetchReason.PORT);
  return PASS;
};

const blockedLookupError = (hostname: string): NodeJS.ErrnoException =>
  Object.assign(new Error(`safe-fetch: blocked address for ${hostname}`), {
    code: BLOCKED_ERROR_CODE,
  });

/**
 * Soket bu lookup'ın döndürdüğü adreslere açılır. Ön kontrolden sonra DNS cevabı değişse bile
 * (rebinding) burada yeniden doğrulanır; doğrulanmamış bir adrese bağlanılmaz.
 */
const guardedLookup =
  (policy: AddressPolicy): LookupFunction =>
  (hostname, options, callback) => {
    policy.resolve(hostname).then(
      addresses => {
        if (addresses.length === 0) {
          callback(Object.assign(new Error('safe-fetch: no address'), { code: 'ENOTFOUND' }), '');
          return;
        }
        if (!addresses.every(a => isAcceptable(policy, a.address))) {
          callback(blockedLookupError(hostname), '');
          return;
        }
        const [first] = addresses;
        if (options.all === true) callback(null, [...addresses]);
        else if (first) callback(null, first.address, first.family);
      },
      (error: NodeJS.ErrnoException) => callback(error, '')
    );
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
const discard = (body: Readable): void => {
  body.on('error', ignoreExpectedAbort);
  body.destroy();
};

const ignoreExpectedAbort = (): void => {
  // Bilinçli kapatma; sonuç zaten belirlendi.
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
    resolve: options.resolve ?? defaultResolve,
    allow: new Set(options.allowAddresses ?? []),
  };

  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    // Geçersiz URL kullanıcı girdisidir; hata değil, sonuçtur.
    return failure('blocked', SafeFetchReason.INVALID_URL);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const agent = new Agent({
    connect: { lookup: guardedLookup(policy), timeout: timeoutMs },
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
    allowH2: false,
  });

  try {
    for (let hop = 0; ; hop += 1) {
      const check = await checkTarget(current, policy);
      if (!check.ok) return check;

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
        discard(response.body);
        if (hop >= maxRedirects) return failure('blocked', SafeFetchReason.TOO_MANY_REDIRECTS);
        const location = headerValue(response.headers.location);
        if (!location) return failure('failed', SafeFetchReason.REDIRECT_LOCATION);
        try {
          current = new URL(location, current);
        } catch {
          // Bozuk Location başlığı uzak sunucu kaynaklı; sonuç olarak döner.
          return failure('failed', SafeFetchReason.REDIRECT_LOCATION);
        }
        continue;
      }

      if (response.statusCode < 200 || response.statusCode > 299) {
        discard(response.body);
        return failure('failed', SafeFetchReason.HTTP_STATUS);
      }

      const { mediaType, charset } = parseContentType(
        headerValue(response.headers['content-type'])
      );
      if (mediaType !== 'text/html') {
        discard(response.body);
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
        discard(response.body);
      }
    }
  } catch (error) {
    if (controller.signal.aborted) return failure('failed', SafeFetchReason.TIMEOUT);
    if (hasCode(error, BLOCKED_ERROR_CODE)) return failure('blocked', SafeFetchReason.ADDRESS);
    if (isNetworkError(error)) return failure('failed', SafeFetchReason.NETWORK);
    throw error;
  } finally {
    clearTimeout(timer);
    agent.destroy().catch(() => {
      // Kapanış hatası yalnızca zaten kopmuş soketleri ifade eder; sonucu etkilemez.
    });
  }
};

// undici hataları `UND_ERR_*`, Node soket/DNS hataları `E*` kodu taşır.
const isNetworkError = (error: unknown): boolean => {
  const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
  return typeof code === 'string' && (code.startsWith('UND_ERR') || /^E[A-Z]+$/.test(code));
};
