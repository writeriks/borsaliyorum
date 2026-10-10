import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  codePointRanges,
  extractGeneratedBlock,
  generateHashtagSql,
  HASHTAG_SQL_MIGRATION,
} from '../../scripts/hashtag-sql';

describe('hashtag SQL generator', () => {
  it('the migration carries exactly the generated block (SQL classes = TS regex classes)', () => {
    const sql = readFileSync(
      path.resolve('prisma/migrations', HASHTAG_SQL_MIGRATION, 'migration.sql'),
      'utf8'
    );
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
