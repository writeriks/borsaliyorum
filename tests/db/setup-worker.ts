import { afterAll, beforeAll } from 'vitest';

import { disconnectDb } from '@/lib/db';

import { createDatabase, truncateAll, withClient } from './admin';
import { databaseUrl, TEMPLATE_DB, workerDatabaseName } from './config';

/**
 * Integration setupFile: her test dosyasından önce çalışır.
 * - Worker'ın DB'si (`bt_w<VITEST_POOL_ID>`) yoksa şablondan kopyalanır (milisaniyeler).
 * - `DATABASE_URL` bu DB'ye çevrilir; `getDb()` ilk çağrıda buna bağlanır.
 * - Dosyalar birbirinin verisini görmesin diye tüm tablolar boşaltılır.
 */
const DUPLICATE_DATABASE = '42P04';

const ensureWorkerDatabase = async (name: string): Promise<void> => {
  try {
    await createDatabase(name, TEMPLATE_DB);
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
