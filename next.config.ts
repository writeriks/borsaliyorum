import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import createNextIntlPlugin from 'next-intl/plugin';

import { assertBuildEnv } from './src/lib/env';

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

const config = (phase: string): NextConfig => {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const { skipped } = assertBuildEnv(process.env);
    if (skipped) {
      console.warn('[env] SKIP_ENV_VALIDATION=1: ortam değişkeni doğrulaması atlandı.');
    }
  }
  return withNextIntl(baseConfig);
};

export default config;
