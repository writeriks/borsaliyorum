import { afterAll, beforeAll } from 'vitest';

import { disconnectDb } from '@/lib/db';

import { createDatabase, truncateAll, withClient } from './admin';
import { databaseUrl } from './config';
import { templateDatabase, workerDatabaseName } from './worker';

/**
 * Integration setupFile: her test dosyasından önce çalışır.
 * - Worker'ın DB'si (`bt_<runId>_w<VITEST_POOL_ID>`) yoksa koşunun şablonundan kopyalanır.
 * - `DATABASE_URL` bu DB'ye çevrilir; `getDb()` ilk çağrıda buna bağlanır.
 * - Dosyalar birbirinin verisini görmesin diye tüm tablolar boşaltılır.
 */
const DUPLICATE_DATABASE = '42P04';

const ensureWorkerDatabase = async (name: string): Promise<void> => {
  try {
    await createDatabase(name, templateDatabase());
  } catch (error) {
    if ((error as { code?: string }).code !== DUPLICATE_DATABASE) throw error;
  }
};

beforeAll(async () => {
  const name = workerDatabaseName();
  await ensureWorkerDatabase(name);
  const url = databaseUrl(name);
  process.env.DATABASE_URL = url;
  await withClient(url, truncateAll);
});

afterAll(async () => {
  await disconnectDb();
});
