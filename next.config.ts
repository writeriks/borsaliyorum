import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

import { assertBuildEnv } from './src/lib/env';
import { assertLegalTextsPublishable } from './src/lib/legal/publish-gate';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Not: `env` alanı bilinçli olarak YOK. Oradaki her değer istemci bundle'ına gömülür;
 * v1 `FIREBASE_PRIVATE_KEY`'i böyle sızdırma riskine sokuyordu. Sunucu değerleri
 * `src/lib/env.server.ts`, istemci değerleri `NEXT_PUBLIC_*` ile okunur.
 */
export const baseConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

/**
 * Production dışındaki her ortam (Vercel preview/development, yerel) arama motorlarına
 * kapalı: preview URL'leri herkese açık ve prod içeriğini kopyalıyor (yinelenen içerik,
 * yayınlanmamış özellikler).
 */
export const noindexHeaders =
  (vercelEnv: string | undefined): NextConfig['headers'] =>
  async () =>
    vercelEnv === 'production'
      ? []
      : [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] }];

/** `messages/legal/<dil>.json` (yer tutucu kapısı için ham içerik). */
const readLegalCatalogs = (): Record<string, unknown> =>
  Object.fromEntries(
    ['tr', 'en'].map(locale => [
      locale,
      JSON.parse(
        readFileSync(path.join(process.cwd(), 'messages', 'legal', `${locale}.json`), 'utf8')
      ) as unknown,
    ])
  );

const config = (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    // SKIP_ENV_VALIDATION'dan bağımsız: production'a yer tutuculu yasal metin çıkmaz
    assertLegalTextsPublishable(process.env, readLegalCatalogs());
    const { skipped } = assertBuildEnv(process.env);
    if (skipped) {
      console.warn('[env] SKIP_ENV_VALIDATION=1: ortam değişkeni doğrulaması atlandı.');
    }
  }
  return withNextIntl({ ...baseConfig, headers: noindexHeaders(process.env.VERCEL_ENV) });
};

export default config;
