/**
 * `npm run db:seed` (prisma db seed) — sentetik veri. Prod'a asla yazmaz:
 * - `VERCEL_ENV=production` iken reddeder.
 * - Yerel olmayan bir host'a (ör. Neon preview branch'i) yalnızca `SEED_ALLOW_HOST=<host>`
 *   açıkça o host'u gösteriyorsa yazar.
 */
import { createDbHandle } from '@/lib/db/create-client';

import { runSeed } from './seed-data/run-seed';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const resolveUrl = (): string => {
  const raw = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL tanımlı değil.');
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Seed prod ortamında çalıştırılamaz.');
  }
  const { hostname } = new URL(raw);
  if (!LOCAL_HOSTS.has(hostname) && process.env.SEED_ALLOW_HOST !== hostname) {
    throw new Error(
      `Yerel olmayan host (${hostname}). Bilerek yazıyorsan SEED_ALLOW_HOST=${hostname} ver.`
    );
  }
  return raw;
};

const main = async (): Promise<void> => {
  const db = createDbHandle(resolveUrl(), { max: 2, connectionTimeoutMillis: 10_000 });
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
