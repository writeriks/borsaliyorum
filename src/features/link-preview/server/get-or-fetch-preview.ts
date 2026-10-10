import 'server-only';

import { createHash } from 'node:crypto';

import type { LinkPreviewStatus } from '@/generated/prisma/client';
import type { PrismaClient } from '@/lib/db';
import { getSafeFetchTestAllow } from '@/lib/env.server';
import { extractPreviewMeta, type PreviewMeta } from '@/lib/link-preview/parse-meta';
import { logger as defaultLogger, type Logger } from '@/lib/logger';
import { safeFetchHtml, type SafeFetchOptions } from '@/lib/safe-fetch';

import type { LinkPreviewDto } from '../types';

import { normalizePreviewUrl } from './normalize-preview-url';

/** Başarılı önizleme 24 saat, başarısız/engelli 1 saat önbellekte kalır (ADR-0002 Karar 6). */
export const PREVIEW_TTL_MS = { ok: 24 * 60 * 60 * 1000, failed: 60 * 60 * 1000 } as const;

// İç linkler önizleme almaz (tasarım §6).
const OWN_HOSTS = ['borsaliyorum.com'];

export type PreviewDeps = {
  readonly db: PrismaClient;
  readonly logger?: Logger;
  readonly now?: () => Date;
  /** Testlerde sahte DNS/zaman aşımı; `allowAddresses` verilmezse env'den okunur. */
  readonly fetchOptions?: SafeFetchOptions;
};

export const urlHashOf = (normalizedUrl: string): string =>
  createHash('sha256').update(normalizedUrl).digest('hex');

const displayHost = (url: string): string => new URL(url).hostname.replace(/^www\./, '');

const isOwnHost = (url: string): boolean => {
  const host = new URL(url).hostname.replace(/\.$/, '');
  return OWN_HOSTS.some(own => host === own || host.endsWith(`.${own}`));
};

type StoredPreview = {
  readonly url: string;
  readonly status: LinkPreviewStatus;
  readonly siteName: string | null;
  readonly title: string | null;
  readonly description: string | null;
};

const toDto = (row: StoredPreview): LinkPreviewDto | null =>
  row.status === 'ok' && row.title !== null
    ? {
        url: row.url,
        host: displayHost(row.url),
        siteName: row.siteName,
        title: row.title,
        description: row.description,
      }
    : null;

/**
 * Önbellekli önizleme: geçerli kayıt varsa ağdan çekmez; yoksa safeFetch ile çeker ve sonucu
 * (başarısızlık dahil) `LinkPreview`'a yazar. Önizleme yoksa null döner — çağıran hata
 * göstermez (tasarım §6: sessizce önizleme yok).
 */
export const getOrFetchPreview = async (
  rawUrl: string,
  deps: PreviewDeps
): Promise<LinkPreviewDto | null> => {
  const log = (deps.logger ?? defaultLogger).child({ module: 'link-preview' });
  const now = deps.now?.() ?? new Date();

  let url: string;
  try {
    url = normalizePreviewUrl(rawUrl);
  } catch {
    // Şema zaten URL doğruluyor; buraya düşen girdi önizlenemez, hata değildir.
    return null;
  }
  if (isOwnHost(url)) return null;

  const urlHash = urlHashOf(url);
  const cached = await deps.db.linkPreview.findUnique({ where: { urlHash } });
  if (cached && cached.expiresAt > now) return toDto(cached);

  const result = await safeFetchHtml(
    url,
    async body => extractPreviewMeta(body.chunks, body.charset),
    { allowAddresses: getSafeFetchTestAllow(), ...deps.fetchOptions }
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

  const data = {
    url,
    finalUrl: result.ok ? result.finalUrl : null,
    status,
    ...meta,
    fetchedAt: now,
    expiresAt: new Date(
      now.getTime() + (status === 'ok' ? PREVIEW_TTL_MS.ok : PREVIEW_TTL_MS.failed)
    ),
  };
  const row = await deps.db.linkPreview.upsert({
    where: { urlHash },
    create: { urlHash, ...data },
    update: data,
  });
  return toDto(row);
};
