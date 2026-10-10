import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertLocalDatabaseUrl } from '@tests/db/config';
import {
  countStatements,
  findDestructive,
  isContractMigration,
  LEGACY_MIGRATIONS,
} from '@tests/db/migration-rules';

describe('findDestructive', () => {
  it.each([
    ['DROP TABLE "Post";', 'DROP'],
    ['DROP INDEX "Post_createdAt_idx";', 'DROP'],
    ['ALTER TABLE "Post" DROP COLUMN "mediaUrl";', 'DROP'],
    ['ALTER TABLE "Post" RENAME COLUMN "content" TO "body";', 'RENAME'],
    ['ALTER TABLE "Post" ALTER COLUMN "content" TYPE VARCHAR(10);', 'ALTER ... TYPE'],
    ['ALTER TABLE "Post" ALTER COLUMN "content" SET DATA TYPE VARCHAR(10);', 'ALTER ... TYPE'],
    ['ALTER TABLE "Post" ALTER COLUMN "mediaUrl" SET NOT NULL;', 'SET NOT NULL'],
  ])('flags %s', (sql, problem) => {
    expect(findDestructive(sql)).toContain(problem);
  });

  it('flags a NOT NULL column without DEFAULT but not one with DEFAULT', () => {
    const sql = `ALTER TABLE "Post" ADD COLUMN "a" INTEGER NOT NULL,
      ADD COLUMN "b" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "c" TEXT;`;

    expect(findDestructive(sql)).toEqual([
      `DEFAULT'suz NOT NULL kolon: ADD COLUMN "a" INTEGER NOT NULL`,
    ]);
  });

  it('ignores keywords inside comments and accepts additive SQL', () => {
    const sql = `-- DROP TABLE "Post"; ileride contract fazında
      /* RENAME yok */
      CREATE TABLE "X" ("id" SERIAL NOT NULL, CONSTRAINT "X_pkey" PRIMARY KEY ("id"));
      ALTER TABLE "Post" ADD CONSTRAINT "f" FOREIGN KEY ("a") REFERENCES "X"("id") ON DELETE SET NULL;
      CREATE TYPE "S" AS ENUM ('a');`;

    expect(findDestructive(sql)).toEqual([]);
  });
});

describe('countStatements', () => {
  it('counts statements outside comments and dollar-quoted bodies', () => {
    const sql = `-- yorum; noktalı virgül
      CREATE FUNCTION f() RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM 1; PERFORM 2; END; $$;
      CREATE INDEX CONCURRENTLY "i" ON "T"("a");`;

    expect(countStatements(sql)).toBe(2);
  });
});

describe('isContractMigration', () => {
  it('requires the marker on the first line', () => {
    expect(isContractMigration('-- migration:contract\nDROP TABLE "x";')).toBe(true);
    expect(isContractMigration('SELECT 1;\n-- migration:contract')).toBe(false);
  });
});

describe('repository migrations', () => {
  const migrationsDir = path.resolve('prisma/migrations');
  const v2 = readdirSync(migrationsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !(LEGACY_MIGRATIONS as readonly string[]).includes(name));

  it('has v2 migrations after the legacy baseline', () => {
    expect(v2.length).toBeGreaterThan(0);
    const lastLegacy = LEGACY_MIGRATIONS.at(-1) ?? '';
    expect(v2.every(name => name > lastLegacy)).toBe(true);
  });

  it.each(v2)('%s is additive and has a rollback script', name => {
    const sql = readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8');
    const rollback = readFileSync(path.resolve('prisma/rollback', `${name}.down.sql`), 'utf8');

    expect(isContractMigration(sql) ? [] : findDestructive(sql)).toEqual([]);
    expect(rollback).toContain(`"migration_name" = '${name}'`);
  });
});

describe('assertLocalDatabaseUrl', () => {
  it.each([
    'postgresql://postgres:test@localhost:54329/postgres',
    'postgresql://postgres:test@127.0.0.1:5432/x',
  ])('accepts %s', url => {
    expect(() => assertLocalDatabaseUrl(url)).not.toThrow();
  });

  it.each([
    'postgresql://u:p@ep-cool-name-123.eu-central-1.aws.neon.tech/neondb?sslmode=require',
    'postgresql://u:p@10.0.0.5:5432/db',
    'mysql://u:p@localhost/db',
    'not a url',
  ])('rejects %s', url => {
    expect(() => assertLocalDatabaseUrl(url)).toThrow();
  });
});
