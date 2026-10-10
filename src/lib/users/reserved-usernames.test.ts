import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isReservedUsername, RESERVED_USERNAMES } from './reserved-usernames';

const BACKFILL = '20261010120600_m1_user_onboarded_backfill';

describe('reserved usernames', () => {
  it('contains the names required by auth-session and follows the username rule', () => {
    expect(RESERVED_USERNAMES).toEqual(expect.arrayContaining(['admin', 'borsaliyorum', 'spk']));
    for (const name of RESERVED_USERNAMES) expect(name).toMatch(/^[a-z0-9_]{3,20}$/);
    expect(new Set(RESERVED_USERNAMES).size).toBe(RESERVED_USERNAMES.length);
  });

  it('matches case-insensitively and exactly', () => {
    expect(isReservedUsername('Admin')).toBe(true);
    expect(isReservedUsername('admin_ali')).toBe(false);
  });

  it('the onboarded backfill migration excludes exactly the same list', () => {
    const sql = readFileSync(path.resolve('prisma/migrations', BACKFILL, 'migration.sql'), 'utf8');
    const array = /<> ALL \(ARRAY\[([\s\S]*?)\]::text\[\]\)/.exec(sql)?.[1] ?? '';
    const names = [...array.matchAll(/'([^']+)'/g)].map(match => match[1]);

    expect([...names].sort()).toEqual([...RESERVED_USERNAMES].sort());
  });
});
