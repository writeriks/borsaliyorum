import 'server-only';

import type { LinkPreviewStatus } from '@/generated/prisma/client';
import type { PrismaClient } from '@/lib/db';
import { getSafeFetchTestAllow, getSiteUrl } from '@/lib/env.server';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { safeFetchHtml, type SafeFetchOptions } from '@/lib/safe-fetch';

import { normalizePreviewUrl } from './normalize-url';
import { extractPreviewMeta, type PreviewMeta } from './parse-meta';
import type { LinkPreviewDto } from './types';
import { previewUrlHash } from './url-hash';

/**
 * Önbellekli link önizleme (ADR-0002 Karar 6). `lib/`'tedir: hem `GET /api/link-preview`
 * (features/link-preview) hem gönderi oluşturma (features/posts, S10) kullanır.
 */

/** Başarılı önizleme 24 saat, başarısız/engelli 1 saat önbellekte kalır. */
export const PREVIEW_TTL_MS = { ok: 24 * 60 * 60 * 1000, failed: 60 * 60 * 1000 } as const;

// Üretim alan adı her ortamda iç sayılır (preview deploy'lardan prod'a giden linkler de).
const PRODUCTION_HOST = 'borsaliyorum.com';

/**
 * İç linkler önizleme almaz (tasarım §6): `NEXT_PUBLIC_SITE_URL`'nin host'u ve üretim alan adı.
 * Env her çağrıda okunur (testler değiştirebilir); geçersiz değer yapılandırma hatasıdır.
 */
export const getOwnHosts = (): readonly string[] => {
  const siteUrl = getSiteUrl();
  const hosts = new Set([PRODUCTION_HOST]);
  if (siteUrl) hosts.add(new URL(siteUrl).hostname.replace(/^www\./, ''));
  return [...hosts];
};

export type PreviewDeps = {
  readonly db: PrismaClient;
  readonly logger?: Logger;
  readonly now?: () => Date;
  /** Verilmezse `getOwnHosts()`. */
  readonly ownHosts?: readonly string[];
  /** Testlerde sahte DNS/zaman aşımı; `allowAddresses` verilmezse env'den okunur. */
  readonly fetchOptions?: SafeFetchOptions;
};

const hostOf = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

const isOwnHost = (url: string, ownHosts: readonly string[]): boolean => {
  const host = new URL(url).hostname;
  return ownHosts.some(own => host === own || host.endsWith(`.${own}`));
};

type StoredPreview = {
  readonly url: string;
  readonly finalUrl: string | null;
  readonly status: LinkPreviewStatus;
  readonly siteName: string | null;
  readonly title: string | null;
  readonly description: string | null;
};

const toDto = (row: StoredPreview): LinkPreviewDto | null =>
  row.status === 'ok' && row.title !== null
    ? {
        url: row.url,
        // safeFetch siteler arası yönlendirmeyi engeller; finalUrl aynı sitededir.
        host: hostOf(row.finalUrl ?? row.url),
        siteName: row.siteName,
        title: row.title,
        description: row.description,
      }
    : null;

type PreviewData = StoredPreview & { readonly fetchedAt: Date; readonly expiresAt: Date };

/**
 * Sonucu yazar. `ok` her zaman kazanır. `failed`/`blocked` mevcut bir `ok` kaydını **ezmez**:
 * başka bir istek/instance az önce başarılı yazmış olabilir, ya da kayıt bir gönderiye bağlıdır
 * ve kartı silinmemelidir. Süresi dolmuş `ok` kaydında yalnızca bir sonraki deneme ertelenir.
 * Her adım tek ifadedir; koşul satırın o anki haline göre DB'de değerlendirilir.
 */
const storePreview = async (
  db: PrismaClient,
  urlHash: string,
  data: PreviewData,
  now: Date
): Promise<StoredPreview> => {
  if (data.status === 'ok') {
    return db.linkPreview.upsert({
      where: { urlHash },
      create: { urlHash, ...data },
      update: data,
    });
  }
  const created = await db.linkPreview.createMany({
    data: [{ urlHash, ...data }],
    skipDuplicates: true,
  });
  if (created.count === 0) {
    const replaced = await db.linkPreview.updateMany({
      where: { urlHash, status: { not: 'ok' } },
      data,
    });
    if (replaced.count === 0) {
      await db.linkPreview.updateMany({
        where: { urlHash, status: 'ok', expiresAt: { lte: now } },
        data: { expiresAt: data.expiresAt },
      });
    }
  }
  return db.linkPreview.findUniqueOrThrow({ where: { urlHash } });
};

const loadPreview = async (
  url: string,
  urlHash: string,
  deps: PreviewDeps
): Promise<LinkPreviewDto | null> => {
  const log = (deps.logger ?? defaultLogger).child({ module: 'link-preview' });
  const now = deps.now?.() ?? new Date();

  const cached = await deps.db.linkPreview.findUnique({ where: { urlHash } });
  if (cached && cached.expiresAt > now) return toDto(cached);

  const result = await safeFetchHtml(
    url,
    async body => extractPreviewMeta(body.chunks, body.charset),
    { allowAddresses: getSafeFetchTestAllow(), logger: log, ...deps.fetchOptions }
  );

  let status: LinkPreviewStatus;
  let meta: PreviewMeta = { title: null, description: null, siteName: null };
  let reason: string;
  if (!result.ok) {
    status = result.kind;
    reason = result.reason;
  } else if (result.value.title === null) {
    // og:title ve <title> yoksa kart oluşmaz.
    status = 'failed';
    reason = 'no_title';
  } else {
    status = 'ok';
    meta = result.value;
    reason = 'ok';
  }
  // URL sorgu dizesi kişisel veri taşıyabilir; yalnızca host loglanır.
  log.info('link preview fetched', { host: new URL(url).hostname, status, reason });

  const row = await storePreview(
    deps.db,
    urlHash,
    {
      url,
      finalUrl: result.ok ? result.finalUrl : null,
      status,
      ...meta,
      fetchedAt: now,
      expiresAt: new Date(
        now.getTime() + (status === 'ok' ? PREVIEW_TTL_MS.ok : PREVIEW_TTL_MS.failed)
      ),
    },
    now
  );
  return toDto(row);
};

// Aynı süreçte aynı URL için eşzamanlı istekler tek fetch'e iner (ör. composer'da hızlı yazım
// + gönderim). Instance'lar arası tekrarı DB'deki koşullu yazım zararsız kılar.
const inflight = new Map<string, Promise<LinkPreviewDto | null>>();

/**
 * Önbellekli önizleme: geçerli kayıt varsa ağdan çekmez; yoksa safeFetch ile çeker ve sonucu
 * (başarısızlık dahil) `LinkPreview`'a yazar. Önizleme yoksa null döner — çağıran hata
 * göstermez (tasarım §6: sessizce önizleme yok). Eşzamanlı çağrılar ilk çağıranın
 * `deps`'iyle çalışan tek işi paylaşır.
 */
export const getOrFetchPreview = (
  rawUrl: string,
  deps: PreviewDeps
): Promise<LinkPreviewDto | null> => {
  const url = normalizePreviewUrl(rawUrl);
  if (url === null || isOwnHost(url, deps.ownHosts ?? getOwnHosts())) {
    return Promise.resolve(null);
  }
  const urlHash = previewUrlHash(url);

  // Kontrol ve kayıt arasında `await` yok: iki çağrı aynı anda haritada boşluk göremez.
  const running = inflight.get(urlHash);
  if (running) return running;
  const task = loadPreview(url, urlHash, deps).finally(() => inflight.delete(urlHash));
  inflight.set(urlHash, task);
  return task;
};
