import { randomInt } from 'node:crypto';

import { test as base } from '@playwright/test';

import {
  collectPageDiagnostics,
  type PageDiagnostic,
  reportPageDiagnostics,
} from './page-diagnostics';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';

/** TEST-NET-2 (198.51.100.0/24, RFC 5737): belgeleme aralığı, gerçek bir istemciye ait değil. */
const randomTestIp = (): string => `198.51.100.${randomInt(1, 255)}`;

/**
 * Giriş yapan E2E testleri için `test`: her test kendi istemci IP'siyle gelir (`x-real-ip`;
 * yerel `next start`'ta Vercel kenarı yok, başlık olduğu gibi okunur). Böylece IP başına auth
 * rate limit'i (`auth.session.ip`, 10 dk'da 30) paralel koşan onlarca testin girişini tek bir
 * "kullanıcı" saymaz; her test gerçek bir ziyaretçi gibi kendi kovasını kullanır.
 *
 * `pageDiagnostics`: varsayılan bağlamdaki sayfa hataları (`pageerror`, `console.error`, 5xx)
 * toplanır; test başarısız olursa çıktıya basılır (bkz. `support/page-diagnostics.ts`).
 */
export const test = base.extend<{ clientIp: string; pageDiagnostics: PageDiagnostic[] }>({
  clientIp: [
    async ({ context }, use) => {
      const ip = randomTestIp();
      await context.setExtraHTTPHeaders({ 'x-real-ip': ip });
      await use(ip);
    },
    { auto: true },
  ],
  pageDiagnostics: [
    async ({ context }, use, testInfo) => {
      const { entries, dispose } = collectPageDiagnostics(context);
      await use(entries);
      dispose();
      await reportPageDiagnostics(entries, testInfo);
    },
    { auto: true },
  ],
});
