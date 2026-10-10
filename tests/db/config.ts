/**
 * Test veritabanı adresleri (ADR-0003 Karar 3). Testler **asla** prod/Neon'a bağlanmaz
 * (kararlar K2): sunucu yalnızca yerel olabilir, aksi halde süreç hemen durur.
 *
 * Yerel: `npm run db:test:up` (scripts/pg-local.sh), CI: GitHub Actions postgres service.
 */
export const DEFAULT_TEST_DATABASE_URL = 'postgresql://postgres:test@localhost:54329/postgres';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export const TEMPLATE_DB = 'bt_template';
export const WORKER_DB_PREFIX = 'bt_w';

/** Bağlantı adresini doğrular; yerel olmayan host'u reddeder. */
export const assertLocalDatabaseUrl = (raw: string): URL => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('TEST_DATABASE_URL geçerli bir URL değil.');
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('TEST_DATABASE_URL postgresql:// olmalı.');
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Testler yalnızca yerel Postgres'e bağlanır; "${url.hostname}" reddedildi (kararlar K2).`
    );
  }
  return url;
};

/** Yönetim bağlantısı (CREATE/DROP DATABASE için `postgres` veritabanı). */
export const getAdminUrl = (): string =>
  assertLocalDatabaseUrl(process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL).toString();

/** Aynı sunucuda başka bir veritabanının adresi. */
export const databaseUrl = (database: string): string => {
  if (!/^[a-z0-9_]{1,63}$/.test(database)) throw new Error(`Geçersiz DB adı: ${database}`);
  const url = new URL(getAdminUrl());
  url.pathname = `/${database}`;
  return url.toString();
};

export const workerDatabaseName = (): string => {
  const poolId = process.env.VITEST_POOL_ID ?? '1';
  if (!/^\d+$/.test(poolId)) throw new Error(`Beklenmeyen VITEST_POOL_ID: ${poolId}`);
  return `${WORKER_DB_PREFIX}${poolId}`;
};
