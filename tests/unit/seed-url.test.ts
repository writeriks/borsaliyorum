import { describe, expect, it } from 'vitest';

import { resolveSeedUrl } from '../../prisma/seed-data/resolve-url';

describe('resolveSeedUrl', () => {
  const local = 'postgresql://postgres:test@localhost:54329/dev';

  it('accepts a local URL', () => {
    expect(resolveSeedUrl({ DATABASE_URL: local })).toBe(local);
  });

  it('rejects ?host= that points a localhost URL at a remote server', () => {
    expect(() => resolveSeedUrl({ DATABASE_URL: `${local}?host=ep-x.neon.tech` })).toThrow(
      /sorgu parametresi/
    );
    // SEED_ALLOW_HOST da bu biçimi açmaz
    expect(() =>
      resolveSeedUrl({
        DATABASE_URL: `${local}?host=ep-x.neon.tech`,
        SEED_ALLOW_HOST: 'ep-x.neon.tech',
      })
    ).toThrow(/sorgu parametresi/);
  });

  it('allows a remote host only when SEED_ALLOW_HOST names it', () => {
    const remote = 'postgresql://u:p@ep-preview.neon.tech/db';
    expect(() => resolveSeedUrl({ DATABASE_URL: remote })).toThrow(/SEED_ALLOW_HOST/);
    expect(resolveSeedUrl({ DATABASE_URL: remote, SEED_ALLOW_HOST: 'ep-preview.neon.tech' })).toBe(
      remote
    );
  });

  it('falls back to DATABASE_URL when DATABASE_URL_UNPOOLED is empty', () => {
    expect(resolveSeedUrl({ DATABASE_URL: local, DATABASE_URL_UNPOOLED: '' })).toBe(local);
  });

  it('refuses production', () => {
    expect(() => resolveSeedUrl({ DATABASE_URL: local, VERCEL_ENV: 'production' })).toThrow(/prod/);
  });
});
