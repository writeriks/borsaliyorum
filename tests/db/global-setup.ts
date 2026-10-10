import { createMigratedDatabase, dropDatabase, listDatabases } from './admin';
import { getAdminUrl, TEMPLATE_DB, WORKER_DB_PREFIX } from './config';

const dropWorkerDatabases = async (): Promise<void> => {
  for (const name of await listDatabases(WORKER_DB_PREFIX)) await dropDatabase(name);
};

/**
 * Integration projesi globalSetup'ı (ADR-0003 Karar 3):
 * 1. `bt_template` sıfırdan kurulur ve **gerçek migration'lar** `prisma migrate deploy` ile
 *    uygulanır (db push değil).
 * 2. Önceki koşulardan kalan worker DB'leri silinir; her worker kendi DB'sini şablondan
 *    `tests/db/setup-worker.ts`'te kopyalar.
 */
const setup = async (): Promise<() => Promise<void>> => {
  const adminUrl = getAdminUrl();
  try {
    await dropWorkerDatabases();
    await createMigratedDatabase(TEMPLATE_DB);
  } catch (error) {
    throw new Error(
      `Test DB kurulamadı (${new URL(adminUrl).host}). Yerelde önce \`npm run db:test:up\`.`,
      { cause: error }
    );
  }
  return dropWorkerDatabases;
};

export default setup;
