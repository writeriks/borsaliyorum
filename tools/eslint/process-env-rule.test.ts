import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Gerçek eslint.config.mjs ile: kural ve istisna dosya kalıpları birlikte doğrulanır
const cwd = fileURLToPath(new URL('../..', import.meta.url));
const eslint = new ESLint({ cwd });

const restrictedHits = async (filePath: string, code: string): Promise<number> => {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter(m => m.ruleId === 'no-restricted-properties').length;
};

const RAW_READS = [
  'export const a = process.env.DATABASE_URL;\n',
  "export const a = process.env['DATABASE_URL'];\n",
  'const { env } = process;\nexport const a = env.X;\n',
];

describe('ham process.env yasağı', () => {
  it.each(['src/features/feed/server/queries.ts', 'src/app/page.tsx', 'tests/unit/x.test.ts'])(
    '%s içinde yasak',
    async filePath => {
      for (const code of RAW_READS) expect(await restrictedHits(filePath, code)).toBe(1);
    }
  );

  it.each([
    'src/lib/env.server.ts',
    'src/lib/env.client.ts',
    'src/lib/logger/logger.ts',
    'next.config.ts',
    'vitest.config.ts',
    'playwright.config.ts',
    'scripts/sync-stocks.mjs',
  ])('%s istisna', async filePath => {
    expect(await restrictedHits(filePath, RAW_READS[0] ?? '')).toBe(0);
  });
});
