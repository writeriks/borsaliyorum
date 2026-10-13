import type { TestProject } from 'vitest/node';

import { createMigratedDatabase, dropDatabase, listDatabases } from './admin';
import {
  createRunId,
  getAdminUrl,
  isStaleRun,
  runPrefix,
  TEST_DB_PREFIX,
  templateDatabaseName,
} from './config';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Bu koşunun kimliği; worker'lar DB adlarını bununla türetir (tests/db/worker.ts). */
    testDbRunId: string;
  }
}

const dropRunDatabases = async (runId: string): Promise<void> => {
  for (const name of await listDatabases(runPrefix(runId))) await dropDatabase(name);
};

/** Sahibi çalışmayan (çökmüş/öldürülmüş) koşulardan kalan DB'ler. Yaşayan koşulara dokunmaz. */
const dropStaleDatabases = async (): Promise<void> => {
  for (const name of await listDatabases(TEST_DB_PREFIX)) {
    if (isStaleRun(name)) await dropDatabase(name);
  }
};

/**
 * Integration projesi globalSetup'ı (ADR-0003 Karar 3):
 * 1. Koşuya özel kimlik üretilir (`r<pid>_<hex>`) ve worker'lara `provide` ile verilir. Aynı
 *    Postgres'i paylaşan paralel koşular (worktree'ler, CI matrisi) birbirinin DB'sini görmez.
 * 2. `bt_<runId>_tpl` sıfırdan kurulur ve **gerçek migration'lar** `prisma migrate deploy` ile
 *    uygulanır (db push değil). Her worker kendi DB'sini şablondan `setup-worker.ts`'te kopyalar.
 * 3. Teardown yalnızca bu koşunun DB'lerini düşürür.
 */
const setup = async (project: TestProject): Promise<() => Promise<void>> => {
  const adminUrl = getAdminUrl();
  const runId = createRunId();
  try {
    await dropStaleDatabases();
    await createMigratedDatabase(templateDatabaseName(runId));
  } catch (error) {
    await dropRunDatabases(runId).catch((cleanupError: unknown) => {
      console.error(`Yarım kalan test DB'leri silinemedi (${runId}):`, cleanupError);
    });
    throw new Error(
      `Test DB kurulamadı (${new URL(adminUrl).host}). Yerelde önce \`npm run db:test:up\`.`,
      { cause: error }
    );
  }
  project.provide('testDbRunId', runId);
  return () => dropRunDatabases(runId);
};

export default setup;
