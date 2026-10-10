import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { Client } from 'pg';

import { databaseUrl, getAdminUrl } from './config';

const execFileAsync = promisify(execFile);

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MIGRATIONS_DIR = path.join(ROOT_DIR, 'prisma/migrations');
export const ROLLBACK_DIR = path.join(ROOT_DIR, 'prisma/rollback');

const quoteIdent = (name: string): string => `"${name.replaceAll('"', '""')}"`;

/** Tek seferlik bağlantı ile iş yapar ve bağlantıyı her durumda kapatır. */
export const withClient = async <T>(
  url: string,
  fn: (client: Client) => Promise<T>
): Promise<T> => {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
};

export const dropDatabase = async (name: string): Promise<void> => {
  await withClient(getAdminUrl(), client =>
    client.query(`DROP DATABASE IF EXISTS ${quoteIdent(name)} WITH (FORCE)`)
  );
};

export const createDatabase = async (name: string, template?: string): Promise<void> => {
  const sql = template
    ? `CREATE DATABASE ${quoteIdent(name)} TEMPLATE ${quoteIdent(template)}`
    : `CREATE DATABASE ${quoteIdent(name)}`;
  await withClient(getAdminUrl(), client => client.query(sql));
};

export const recreateDatabase = async (name: string, template?: string): Promise<void> => {
  await dropDatabase(name);
  await createDatabase(name, template);
};

export const listDatabases = async (prefix: string): Promise<string[]> =>
  withClient(getAdminUrl(), async client => {
    const { rows } = await client.query<{ datname: string }>(
      'SELECT datname FROM pg_database WHERE starts_with(datname, $1)',
      [prefix]
    );
    return rows.map(row => row.datname);
  });

/** Prisma CLI'ı belirtilen test DB'sine karşı çalıştırır (prisma.config.ts üzerinden). */
export const runPrisma = async (
  args: readonly string[],
  database: string,
  extraEnv: Readonly<Record<string, string>> = {}
): Promise<{ stdout: string; stderr: string }> => {
  const url = databaseUrl(database);
  return execFileAsync('npx', ['prisma', ...args], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      // prisma.config.ts önce UNPOOLED'a bakar; testte ikisi de yerel DB olmalı
      DATABASE_URL: url,
      DATABASE_URL_UNPOOLED: url,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
      ...extraEnv,
    },
    maxBuffer: 10 * 1024 * 1024,
  });
};

/** Bir veritabanını sıfırdan kurup tüm migration'ları `prisma migrate deploy` ile uygular. */
export const createMigratedDatabase = async (name: string): Promise<void> => {
  await recreateDatabase(name);
  await runPrisma(['migrate', 'deploy'], name);
};

export const listMigrationNames = async (): Promise<string[]> => {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
};

export const readMigrationSql = async (name: string): Promise<string> =>
  readFile(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');

/**
 * Migration SQL'ini Prisma'sız doğrudan uygular (ara durumları test etmek için, ör. backfill
 * öncesi veri yerleştirme). `_prisma_migrations`'a kayıt yazmaz.
 */
export const applyMigrationFiles = async (url: string, names: readonly string[]): Promise<void> => {
  await withClient(url, async client => {
    for (const name of names) {
      await client.query(await readMigrationSql(name));
    }
  });
};

/** `_prisma_migrations` hariç tüm tabloları boşaltır (ContentEvent koruması bu işlem için açılır). */
export const truncateAll = async (client: Client): Promise<void> => {
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  );
  if (rows.length === 0) return;
  const tables = rows.map(row => quoteIdent(row.tablename)).join(', ');
  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL borsaliyorum.retention_purge = 'on'`);
    await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

/**
 * Repodaki bir script'i (ör. scripts/prod-baseline-check.sh) süreç env'i + verilen env ile
 * çalıştırır. Sıfır olmayan çıkış kodu hata değil, sonuç olarak döner.
 */
export const runRepoScript = async (
  relativePath: string,
  extraEnv: Readonly<Record<string, string>>
): Promise<{ code: number; stdout: string; stderr: string }> => {
  try {
    const { stdout, stderr } = await execFileAsync(path.join(ROOT_DIR, relativePath), [], {
      cwd: ROOT_DIR,
      env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1', ...extraEnv },
      maxBuffer: 10 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const {
      code,
      stdout = '',
      stderr = '',
    } = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    return { code: typeof code === 'number' ? code : -1, stdout, stderr };
  }
};
