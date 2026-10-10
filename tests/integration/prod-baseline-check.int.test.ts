import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  applyMigrationFiles,
  dropDatabase,
  recreateDatabase,
  runRepoScript,
  withClient,
} from '@tests/db/admin';
import { databaseUrl } from '@tests/db/config';
import { LEGACY_MIGRATIONS } from '@tests/db/migration-rules';
import { workerDatabaseName } from '@tests/db/worker';

/**
 * scripts/prod-baseline-check.sh gerçek bir "prod benzeri" DB'ye (v1 migration'ları + elle
 * eklenmiş drift) karşı çalıştırılır. Drift SQL'i baseline → prod yönünde olmalı: çıktı,
 * migration geçmişine eklenince prod şemasını üreten `CREATE …` olmalı, prod'u geri alan `DROP …` değil.
 */
const prodDb = `${workerDatabaseName()}_prodsim`;
const shadowDb = `${workerDatabaseName()}_prodsim_shadow`;

const runCheck = (): ReturnType<typeof runRepoScript> =>
  runRepoScript('scripts/prod-baseline-check.sh', {
    DATABASE_URL_UNPOOLED: databaseUrl(prodDb),
    SHADOW_DATABASE_URL: databaseUrl(shadowDb),
  });

beforeAll(async () => {
  await recreateDatabase(prodDb);
  await recreateDatabase(shadowDb);
  await applyMigrationFiles(databaseUrl(prodDb), LEGACY_MIGRATIONS);
});

afterAll(async () => {
  await dropDatabase(prodDb);
  await dropDatabase(shadowDb);
});

describe('prod-baseline-check.sh', () => {
  it('reports no drift for a DB built from the v1 migrations', async () => {
    const result = await runCheck();

    expect(result.stdout).toContain('SONUÇ: drift yok.');
    expect(result.code).toBe(0);
  });

  it('prints baseline → prod SQL (usable as baseline_fix) when prod has drift', async () => {
    await withClient(databaseUrl(prodDb), client =>
      client.query(`CREATE INDEX "drift_post_content_idx" ON "Post"("content")`)
    );

    const result = await runCheck();

    expect(result.code).toBe(2);
    expect(result.stdout).toMatch(/CREATE INDEX "drift_post_content_idx"/);
    expect(result.stdout).not.toMatch(/DROP INDEX "drift_post_content_idx"/);
  });
});
