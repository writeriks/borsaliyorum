import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  codePointRanges,
  extractGeneratedBlock,
  generateHashtagSql,
  HASHTAG_SQL_MIGRATION,
  readUnicodeStamp,
} from '../../scripts/hashtag-sql';

const readMigration = (): string =>
  readFileSync(path.resolve('prisma/migrations', HASHTAG_SQL_MIGRATION, 'migration.sql'), 'utf8');

const mismatchMessage = (stamp: string | null): string =>
  `Migration Unicode ${stamp ?? '(damga yok)'} ile üretilmiş, bu Node ${process.version} ` +
  `Unicode ${process.versions.unicode} kullanıyor. .nvmrc'deki Node sürümüyle çalıştır.`;

describe('hashtag SQL generator', () => {
  it("the migration was generated with this Node's Unicode version (stamp check first)", () => {
    const stamp = readUnicodeStamp(readMigration());
    // Önce sürüm: farklı Unicode tablosu aşağıdaki karşılaştırmayı binlerce satırlık,
    // anlaşılmaz bir fark olarak düşürürdü.
    expect(stamp, mismatchMessage(stamp)).toBe(process.versions.unicode);
  });

  it('the migration carries exactly the generated block (SQL classes = TS regex classes)', () => {
    const sql = readMigration();
    const stamp = readUnicodeStamp(sql);
    if (stamp !== process.versions.unicode) throw new Error(mismatchMessage(stamp));
    // Fark varsa: `npx tsx scripts/hashtag-sql.ts --write` (yalnızca prod'a uygulanmamışsa;
    // uygulanmışsa yeni migration ile CREATE OR REPLACE FUNCTION — bkz. script başlığı).
    expect(extractGeneratedBlock(sql)).toBe(generateHashtagSql());
  });

  it('builds ranges without NUL and surrogates', () => {
    expect(codePointRanges(/[\s\S]/u)).toEqual([
      [0x1, 0xd7ff],
      [0xe000, 0x10ffff],
    ]);
    expect(codePointRanges(/[a-cx]/u)).toEqual([
      [0x61, 0x63],
      [0x78, 0x78],
    ]);
  });
});
