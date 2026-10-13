import { describe, expect, it } from 'vitest';

import {
  checkLocalDatabaseUrl,
  inspectDatabaseUrl,
  resolveDirectDatabaseUrl,
} from './connection-url';

describe('resolveDirectDatabaseUrl', () => {
  const pooled = 'postgresql://u:p@pooled.example/db';
  const direct = 'postgresql://u:p@direct.example/db';

  it('prefers DATABASE_URL_UNPOOLED', () => {
    expect(resolveDirectDatabaseUrl({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct })).toBe(
      direct
    );
  });

  it('treats an empty DATABASE_URL_UNPOOLED as unset (regression: ?? kept "")', () => {
    expect(resolveDirectDatabaseUrl({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: '' })).toBe(
      pooled
    );
  });

  it('returns undefined when both are missing or empty', () => {
    expect(resolveDirectDatabaseUrl({})).toBeUndefined();
    expect(resolveDirectDatabaseUrl({ DATABASE_URL: '', DATABASE_URL_UNPOOLED: '' })).toBe(
      undefined
    );
  });
});

describe('inspectDatabaseUrl', () => {
  it('reads the host the pg driver would actually use', () => {
    expect(inspectDatabaseUrl('postgresql://u:p@[::1]:5432/db')).toEqual({
      ok: true,
      host: '::1',
      local: true,
    });
    expect(inspectDatabaseUrl('postgres://u:p@ep-x.neon.tech/db?sslmode=verify-full')).toEqual({
      ok: true,
      host: 'ep-x.neon.tech',
      local: false,
    });
  });

  it.each(['host', 'hostaddr'])('rejects a ?%s= override even when it looks local', param => {
    const result = inspectDatabaseUrl(`postgresql://u:p@localhost:54329/postgres?${param}=x`);
    expect(result.ok).toBe(false);
  });
});

describe('checkLocalDatabaseUrl', () => {
  it('rejects localhost URLs that the driver would send to a remote host', () => {
    expect(
      checkLocalDatabaseUrl('postgresql://u:p@localhost:54329/postgres?host=ep-x.neon.tech')
    ).toMatchObject({ ok: false });
  });

  it('rejects a unix socket path given as an encoded host', () => {
    expect(checkLocalDatabaseUrl('postgresql://u:p@%2Ftmp/postgres')).toMatchObject({ ok: false });
  });

  it('accepts plain local URLs', () => {
    expect(checkLocalDatabaseUrl('postgresql://u:p@127.0.0.1:54329/postgres')).toEqual({
      ok: true,
      host: '127.0.0.1',
    });
  });
});
