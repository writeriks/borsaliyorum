/**
 * `npm run db:migrations:check` — migration kapısı (ADR-0003 "Migration testleri"). Yalnızca
 * yerel/CI test Postgres'inde çalışır (TEST_DATABASE_URL, varsayılan localhost:54329).
 *
 *  1. Statik: v2 migration'larında yıkıcı ifade yok (DROP, RENAME, ALTER ... TYPE, SET NOT NULL,
 *     DEFAULT'suz NOT NULL kolon); CONCURRENTLY dosyaları tek ifade; her migration'ın
 *     rollback/<ad>.down.sql'i var. Contract migration'ları ilk satırdaki
 *     `-- migration:contract` işaretiyle muaftır.
 *  2. Boş DB → migrate deploy → migrate diff (DB ↔ schema.prisma) boş; Prisma'nın göremediği
 *     nesneler (fonksiyon, trigger, ifade index'i) mevcut.
 *  3. Eski uygulama (v1) INSERT'leri geçer, yeni kolonlar DEFAULT alır.
 *  4. Tüm down betikleri ters sırada → şema v1 baseline'ına (4 eski migration) eşit.
 *  5. Yeniden migrate deploy → diff yine boş.
 */
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createMigratedDatabase,
  dropDatabase,
  listMigrationNames,
  MIGRATIONS_DIR,
  readMigrationSql,
  recreateDatabase,
  ROLLBACK_DIR,
  runPrisma,
  withClient,
} from '../tests/db/admin';
import { createRunId, databaseUrl, runPrefix } from '../tests/db/config';
import { checkLegacyCompatibility } from '../tests/db/legacy-compat';
import {
  countStatements,
  findDestructive,
  isContractMigration,
  LEGACY_MIGRATIONS,
  stripComments,
} from '../tests/db/migration-rules';

// Koşuya özel adlar: aynı Postgres'te paralel koşan kontroller/testler birbirini bozmasın
const RUN_PREFIX = runPrefix(createRunId());
const CHECK_DB = `${RUN_PREFIX}migcheck`;
const SHADOW_DB = `${RUN_PREFIX}migcheck_shadow`;

/** Prisma'nın şemada ifade edemediği, migration SQL'inin oluşturduğu nesneler. */
const EXTRA_FUNCTIONS = ['fold_tag', 'content_event_guard', 'content_event_purge'];
const EXTRA_TRIGGERS = ['content_event_append_only', 'content_event_no_truncate'];
const EXTRA_INDEXES = ['User_username_lower_pattern_idx'];

const failures: string[] = [];
const step = (message: string): void => console.log(`\n== ${message}`);
const pass = (message: string): void => console.log(`  OK   ${message}`);
const fail = (message: string): void => {
  failures.push(message);
  console.log(`  HATA ${message}`);
};

const staticChecks = async (names: readonly string[]): Promise<void> => {
  step('Statik kontroller');
  const legacy = new Set<string>(LEGACY_MIGRATIONS);
  for (const name of LEGACY_MIGRATIONS) {
    if (!names.includes(name)) fail(`v1 baseline migration'ı eksik: ${name}`);
  }
  const v2 = names.filter(name => !legacy.has(name));
  const rollbacks = new Set(
    (await readdir(ROLLBACK_DIR)).filter(file => file.endsWith('.down.sql'))
  );

  for (const name of v2) {
    const sql = await readMigrationSql(name);
    const contract = isContractMigration(sql);
    const destructive = contract ? [] : findDestructive(sql);
    if (destructive.length > 0) fail(`${name}: yıkıcı ifade (${destructive.join('; ')})`);
    if (/\bCONCURRENTLY\b/i.test(stripComments(sql)) && countStatements(sql) !== 1) {
      fail(`${name}: CONCURRENTLY içeren migration tek ifade olmalı`);
    }
    if (!rollbacks.delete(`${name}.down.sql`)) fail(`${name}: rollback/${name}.down.sql yok`);
  }
  for (const orphan of rollbacks) fail(`rollback/${orphan}: karşılık gelen migration yok`);
  if (failures.length === 0) pass(`${v2.length} v2 migration'ı ve rollback'leri kurallara uygun`);
};

const diffAgainstSchema = async (label: string): Promise<void> => {
  try {
    await runPrisma(
      [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
      ],
      CHECK_DB
    );
    pass(`${label}: DB ↔ schema.prisma farkı yok`);
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    fail(`${label}: DB ile schema.prisma farklı:\n${stdout}${stderr}`);
  }
};

const checkExtraObjects = async (expectPresent: boolean, label: string): Promise<void> => {
  const present = await withClient(databaseUrl(CHECK_DB), async client => {
    const functions = await client.query<{ name: string }>(
      `SELECT proname AS name FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = ANY($1)`,
      [EXTRA_FUNCTIONS]
    );
    const triggers = await client.query<{ name: string }>(
      `SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1)`,
      [EXTRA_TRIGGERS]
    );
    const indexes = await client.query<{ name: string }>(
      `SELECT c.relname AS name FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
       WHERE i.indisvalid AND c.relname = ANY($1)`,
      [EXTRA_INDEXES]
    );
    return [...functions.rows, ...triggers.rows, ...indexes.rows].map(row => row.name);
  });
  const expected = [...EXTRA_FUNCTIONS, ...EXTRA_TRIGGERS, ...EXTRA_INDEXES];
  if (expectPresent) {
    const missing = expected.filter(name => !present.includes(name));
    if (missing.length > 0) fail(`${label}: eksik nesneler: ${missing.join(', ')}`);
    else pass(`${label}: fonksiyon/trigger/ifade index'i mevcut`);
  } else if (present.length > 0) {
    fail(`${label}: geri almadan sonra kalan nesneler: ${present.join(', ')}`);
  } else {
    pass(`${label}: v2 fonksiyon/trigger/index'i kalmadı`);
  }
};

const rollbackAll = async (v2: readonly string[]): Promise<void> => {
  await withClient(databaseUrl(CHECK_DB), async client => {
    for (const name of [...v2].reverse()) {
      const sql = await readFile(path.join(ROLLBACK_DIR, `${name}.down.sql`), 'utf8');
      try {
        await client.query(sql);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw new Error(`${name}.down.sql başarısız: ${(error as Error).message}`, {
          cause: error,
        });
      }
    }
  });
};

const checkBaselineAfterRollback = async (): Promise<void> => {
  const applied = await withClient(databaseUrl(CHECK_DB), async client => {
    const { rows } = await client.query<{ migration_name: string }>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name`
    );
    return rows.map(row => row.migration_name);
  });
  if (JSON.stringify(applied) === JSON.stringify(LEGACY_MIGRATIONS)) {
    pass('_prisma_migrations yalnızca v1 baseline kayıtlarını içeriyor');
  } else {
    fail(`_prisma_migrations beklenmeyen kayıtlar içeriyor: ${applied.join(', ')}`);
  }

  // Yalnızca v1 migration'larından oluşan geçici klasör ↔ DB (shadow DB gerekir)
  const legacyDir = await mkdtemp(path.join(tmpdir(), 'bt-legacy-migrations-'));
  try {
    await cp(
      path.join(MIGRATIONS_DIR, 'migration_lock.toml'),
      path.join(legacyDir, 'migration_lock.toml')
    );
    for (const name of LEGACY_MIGRATIONS) {
      await cp(path.join(MIGRATIONS_DIR, name), path.join(legacyDir, name), { recursive: true });
    }
    await recreateDatabase(SHADOW_DB);
    await runPrisma(
      ['migrate', 'diff', '--from-config-datasource', '--to-migrations', legacyDir, '--exit-code'],
      CHECK_DB,
      { SHADOW_DATABASE_URL: databaseUrl(SHADOW_DB) }
    );
    pass('Geri alma sonrası şema v1 baseline ile aynı');
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    fail(`Geri alma sonrası şema v1 baseline'dan farklı:\n${stdout}${stderr}`);
  } finally {
    await rm(legacyDir, { recursive: true, force: true });
    await dropDatabase(SHADOW_DB);
  }
};

const main = async (): Promise<void> => {
  const names = await listMigrationNames();
  const v2 = names.filter(name => !(LEGACY_MIGRATIONS as readonly string[]).includes(name));
  await staticChecks(names);

  step('Up: boş DB → migrate deploy');
  await createMigratedDatabase(CHECK_DB);
  pass(`${names.length} migration uygulandı`);
  await diffAgainstSchema('up');
  await checkExtraObjects(true, 'up');

  step('Eski uygulama (v1) INSERT uyumluluğu');
  const legacy = await withClient(databaseUrl(CHECK_DB), checkLegacyCompatibility);
  if (legacy.length === 0) pass("v1 INSERT'leri geçti, yeni kolonlar DEFAULT aldı");
  legacy.forEach(fail);

  step('Down: rollback betikleri ters sırada');
  await rollbackAll(v2);
  pass(`${v2.length} down betiği çalıştı`);
  await checkExtraObjects(false, 'down');
  await checkBaselineAfterRollback();

  step('Up (tekrar): migrate deploy');
  await runPrisma(['migrate', 'deploy'], CHECK_DB);
  pass("migration'lar yeniden uygulandı");
  await diffAgainstSchema('re-up');
  await checkExtraObjects(true, 're-up');
};

main()
  .catch((error: unknown) => {
    fail(error instanceof Error ? error.message : String(error));
  })
  .finally(async () => {
    await dropDatabase(CHECK_DB).catch((error: unknown) => {
      console.error(`Temizlik başarısız (${CHECK_DB}):`, error);
    });
    if (failures.length > 0) {
      console.error(`\ndb:migrations:check BAŞARISIZ (${failures.length} hata)`);
      process.exitCode = 1;
    } else {
      console.log('\ndb:migrations:check temiz');
    }
  });
