import { describe, expect, it } from 'vitest';

import { devPagesEnabled } from './env.dev-pages';

describe('devPagesEnabled', () => {
  it.each([
    [{ NODE_ENV: 'development' }, true],
    [{ NODE_ENV: 'test' }, true],
    [{ NODE_ENV: 'production', ENABLE_DEV_PAGES: '1' }, true],
    [{ NODE_ENV: 'production' }, false],
    [{ NODE_ENV: 'production', ENABLE_DEV_PAGES: 'true' }, false],
    [{ NODE_ENV: 'production', VERCEL_ENV: 'preview' }, false],
    [{ NODE_ENV: 'production', VERCEL_ENV: 'production', ENABLE_DEV_PAGES: '1' }, false],
    [{ NODE_ENV: 'development', VERCEL_ENV: 'production' }, false],
  ])('%o → %s', (env, expected) => {
    expect(devPagesEnabled(env)).toBe(expected);
  });
});
