/**
 * `npm run db:seed` (prisma db seed) — sentetik veri. Prod'a asla yazmaz:
 * - `VERCEL_ENV=production` iken reddeder.
 * - Yerel olmayan bir host'a (ör. Neon preview branch'i) yalnızca `SEED_ALLOW_HOST=<host>`
 *   açıkça o host'u gösteriyorsa yazar.
 */
import { createDbHandle } from '@/lib/db/create-client';

import { resolveSeedUrl } from './seed-data/resolve-url';
import { runSeed } from './seed-data/run-seed';

const main = async (): Promise<void> => {
  const db = createDbHandle(resolveSeedUrl(process.env), {
    max: 2,
    connectionTimeoutMillis: 10_000,
  });
  try {
    const summary = await runSeed(db.prisma);
    console.log('Seed tamam:', summary);
  } finally {
    await db.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
