/**
 * `npm run size:check` — `next build` sonrası lazy chunk bütçe kapısı (CI build job'u).
 * Bütçeler `scripts/bundle-budget.ts` → `LAZY_BUDGETS`. Aşım ya da ölçülemeyen bütçe → çıkış 1.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { collectLoadableEntries, evaluateBudgets, formatKb, measureEntry } from './bundle-budget';

const DIST_DIR = path.resolve('.next');

const findManifests = async (dir: string): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name === 'react-loadable-manifest.json') {
      found.push(path.join(entry.parentPath, entry.name));
    }
  }
  return found;
};

const main = async (): Promise<void> => {
  const manifestPaths = await findManifests(path.join(DIST_DIR, 'server', 'app'));
  const manifests = await Promise.all(
    manifestPaths.map(async file => JSON.parse(await readFile(file, 'utf8')) as unknown)
  );
  const entries = await Promise.all(
    collectLoadableEntries(manifests).map(entry => measureEntry(DIST_DIR, entry))
  );
  const results = evaluateBudgets(entries);

  for (const result of results) {
    const { budget, gzipBytes, files, ok } = result;
    const size = gzipBytes === null ? 'bulunamadı' : formatKb(gzipBytes);
    const status = ok ? 'OK ' : 'AŞIM';
    console.log(
      `[size] ${status} ${budget.name}: ${size} gz / bütçe ${formatKb(budget.maxGzipBytes)}` +
        (files.length > 0 ? ` (${files.join(', ')})` : '')
    );
  }
  if (results.some(result => !result.ok)) {
    console.error(
      '[size] Bütçe aşıldı ya da ölçülemedi. `next build` çalıştı mı? Chunk içeriği için: `npx next analyze`.'
    );
    process.exitCode = 1;
  }
};

await main();
