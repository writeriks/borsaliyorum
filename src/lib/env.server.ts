import 'server-only';

import { areDevPagesEnabled, parseServerEnv, type ServerEnv } from '@/lib/env';

let cached: ServerEnv | undefined;

/** Sunucu env'i ilk kullanımda doğrulanır; eksikse istek açık bir hatayla düşer. */
export const getServerEnv = (): ServerEnv => {
  cached ??= parseServerEnv(process.env);
  return cached;
};

/** Bkz. `areDevPagesEnabled`; istek anında okunur (build'e gömülmez). */
export const isDevPagesEnabled = (): boolean =>
  areDevPagesEnabled({
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_DEV_PAGES: process.env.ENABLE_DEV_PAGES,
  });
