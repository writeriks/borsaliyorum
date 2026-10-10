import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

import { resolveDirectDatabaseUrl } from './src/lib/db/connection-url';

// Prisma 7 .env'i kendisi yüklemez. Yerelde .env (gitignore'da) varsa okunur; CI/Vercel'de
// değişkenler ortamdan gelir.
if (existsSync('.env')) process.loadEnvFile('.env');

/**
 * CLI (migrate/diff) yapılandırması. Runtime bağlantısı burada değil, `src/lib/db`'de kurulur.
 *
 * - Migration'lar **doğrudan** (pooler olmayan) URL ile çalışır: Neon/PgBouncer transaction
 *   modunda advisory lock ve `CREATE INDEX CONCURRENTLY` güvenilir değildir. Vercel–Neon
 *   entegrasyonu bu URL'i `DATABASE_URL_UNPOOLED` adıyla verir; tanımsız ya da boşsa `DATABASE_URL`.
 * - `env()` yerine `process.env`: `prisma generate` URL'siz (CI) de çalışabilmeli.
 * - Testler bu dosyayı kullanırken `DATABASE_URL`'i yerel test DB'sine çevirir (tests/db).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: resolveDirectDatabaseUrl(process.env),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
