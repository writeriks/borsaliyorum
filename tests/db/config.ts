import { randomBytes } from 'node:crypto';

import { checkLocalDatabaseUrl } from '@/lib/db/connection-url';

/**
 * Test veritabanı adresleri (ADR-0003 Karar 3). Testler **asla** prod/Neon'a bağlanmaz
 * (kararlar K2): sunucu yalnızca yerel olabilir, aksi halde süreç hemen durur.
 *
 * Yerel: `npm run db:test:up` (scripts/pg-local.sh), CI: GitHub Actions postgres service.
 */
export const DEFAULT_TEST_DATABASE_URL = 'postgresql://postgres:test@localhost:54329/postgres';

/** Bu altyapının oluşturduğu tüm veritabanlarının ortak öneki. */
export const TEST_DB_PREFIX = 'bt_';

/**
 * Koşu kimliği: `r<pid>_<rastgele>`. Aynı Postgres'te paralel koşan test süreçleri (ör. farklı
 * worktree'ler) birbirinin şablon/worker DB'sini düşürmesin diye her DB adı bununla başlar.
 * pid, çökmüş koşulardan kalan DB'leri güvenle temizlemek için (bkz. `isStaleRun`).
 */
export const createRunId = (pid: number = process.pid): string =>
  `r${pid}_${randomBytes(3).toString('hex')}`;

const RUN_ID_RE = /^r(\d+)_[0-9a-f]{6}$/;

/** `bt_<runId>_` — bir koşunun bütün DB'leri bu önekle başlar. */
export const runPrefix = (runId: string): string => {
  if (!RUN_ID_RE.test(runId)) throw new Error(`Geçersiz test koşu kimliği: ${runId}`);
  return `${TEST_DB_PREFIX}${runId}_`;
};

export const templateDatabaseName = (runId: string): string => `${runPrefix(runId)}tpl`;

export const workerDatabaseNameFor = (runId: string, poolId: string): string => {
  if (!/^\d+$/.test(poolId)) throw new Error(`Beklenmeyen VITEST_POOL_ID: ${poolId}`);
  return `${runPrefix(runId)}w${poolId}`;
};

/**
 * DB adından koşu sahibinin pid'i (`bt_r<pid>_<hex>_...`); bu altyapıya ait değilse null.
 * Eski biçimdeki adlar (`bt_template`, `bt_w1`) da null döner ve temizlikte dokunulmaz.
 */
export const runOwnerPid = (database: string): number | null => {
  const match = /^bt_r(\d+)_[0-9a-f]{6}_/.exec(database);
  return match?.[1] ? Number(match[1]) : null;
};

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: süreç var ama başka kullanıcıya ait → yaşıyor say
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** Sahibi artık çalışmayan koşunun DB'si mi (çökmüş/öldürülmüş koşudan kalan)? */
export const isStaleRun = (
  database: string,
  alive: (pid: number) => boolean = isProcessAlive
): boolean => {
  const pid = runOwnerPid(database);
  return pid !== null && pid !== process.pid && !alive(pid);
};

/**
 * Bağlantı adresini doğrular; yerel olmayan host'u ve host'u sorgu parametresiyle değiştiren
 * adresi (`?host=`, `?hostaddr=`) reddeder. Host, pg sürücüsünün kullandığı
 * `pg-connection-string` ile çözülür.
 */
export const assertLocalDatabaseUrl = (raw: string): URL => {
  const check = checkLocalDatabaseUrl(raw);
  if (!check.ok) {
    throw new Error(
      `Testler yalnızca yerel Postgres'e bağlanır; TEST_DATABASE_URL reddedildi: ${check.reason} (kararlar K2).`
    );
  }
  return new URL(raw);
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
