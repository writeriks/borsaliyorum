/**
 * Akış sayfasının (`/akis`) Lighthouse (lab, mobil) ölçümü — S13 performans bütçesi.
 *
 * Production build'e karşı çalışır: E2E sunucusu (emulator + `build:e2e` + `start:e2e`) ayakta
 * olmalı. Gerçek Firebase/Neon kullanılmaz; kullanıcı ve gönderiler E2E veritabanına tohumlanır,
 * oturum çerezi emulator'le gerçek giriş formundan alınır ve Lighthouse'a başlık olarak verilir.
 *
 *   npm run emulators &                               # ya da E2E koşusunun sunucuları
 *   npm run build:e2e && npm run start:e2e &          # e2eServerEnv() ile (bkz. tests/e2e/support/env.ts)
 *   npx tsx scripts/lighthouse-feed.ts [--runs 3]
 *
 * Lighthouse bağımlılık olarak eklenmez (büyük); sabit sürümle npx üzerinden çalışır.
 * `LIGHTHOUSE_BIN` verilirse o kullanılır. Chromium: `PW_CHROMIUM_EXECUTABLE` ya da Playwright'ın.
 * Çıktı: `.lighthouse/feed-<n>.json` (gitignore'da) ve konsolda skor + metrikler.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright';

if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');

const LIGHTHOUSE_VERSION = '13.5.0';
const BUDGET = 0.9;

const { E2E_BASE_URL } = await import('../tests/e2e/support/env');
const { loginViaUi, seedOnboardedUser, withDb } = await import('../tests/e2e/support/auth');

const runsArg = process.argv.indexOf('--runs');
const runs = runsArg === -1 ? 3 : Number(process.argv[runsArg + 1] ?? 3);

const userIdOf = (username: string): Promise<number> =>
  withDb(async client => {
    const { rows } = await client.query<{ userId: number }>(
      'SELECT "userId" FROM "User" WHERE username = $1',
      [username]
    );
    const id = rows[0]?.userId;
    if (id === undefined) throw new Error(`kullanıcı yok: ${username}`);
    return id;
  });

/** Gerçekçi akış: takip edilen yazarın 25 gönderisi (ilk sayfa 20 + sonraki sayfa). */
const seedFeed = async (): Promise<{ email: string; password: string }> => {
  const viewer = await seedOnboardedUser();
  const author = await seedOnboardedUser();
  const [viewerId, authorId] = await Promise.all([
    userIdOf(viewer.username),
    userIdOf(author.username),
  ]);
  await withDb(async client => {
    await client.query(
      'INSERT INTO "UserFollowers" ("followerId", "followingId") VALUES ($1, $2)',
      [viewerId, authorId]
    );
    for (let i = 0; i < Number(process.env.LH_POSTS ?? 25); i += 1) {
      await client.query(
        `INSERT INTO "Post" (content, sentiment, "contentFormat", "userId", "createdAt")
         VALUES ($1, 'neutral', 2, $2, now() - make_interval(mins => $3))`,
        [
          `Lighthouse ölçüm gönderisi ${i}: bugün piyasada hacim düşük, bilanço dönemi ` +
            'yaklaşırken temkinli olmakta fayda var. https://www.kap.org.tr/tr/',
          authorId,
          i + 1,
        ]
      );
    }
  });
  return viewer;
};

const sessionCookie = async (account: { email: string; password: string }): Promise<string> => {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_EXECUTABLE || undefined,
  });
  try {
    const page = await browser.newPage({ baseURL: E2E_BASE_URL, locale: 'tr-TR' });
    await loginViaUi(page, account);
    await page.waitForURL('**/akis');
    const cookies = await page.context().cookies();
    const session = cookies.find(cookie => cookie.name === '__session');
    if (!session) throw new Error('__session çerezi alınamadı');
    return `__session=${session.value}`;
  } finally {
    await browser.close();
  }
};

type LighthouseReport = {
  categories: { performance: { score: number | null } };
  audits: Record<string, { numericValue?: number; displayValue?: string }>;
};

const runLighthouse = (cookie: string, output: string): LighthouseReport => {
  const bin = process.env.LIGHTHOUSE_BIN;
  const [command, prefix] = bin
    ? [bin, [] as string[]]
    : ['npx', ['-y', `lighthouse@${LIGHTHOUSE_VERSION}`]];
  const chromePath = process.env.PW_CHROMIUM_EXECUTABLE || chromium.executablePath();
  const result = spawnSync(
    command,
    [
      ...prefix,
      `${E2E_BASE_URL}/akis`,
      '--only-categories=performance',
      '--output=json',
      `--output-path=${output}`,
      `--extra-headers=${JSON.stringify({ Cookie: cookie })}`,
      '--chrome-flags=--headless=new --no-sandbox',
      '--quiet',
    ],
    { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath } }
  );
  if (result.status !== 0) throw new Error(`lighthouse çıkış kodu ${result.status}`);
  return JSON.parse(readFileSync(output, 'utf8')) as LighthouseReport;
};

const METRICS = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
] as const;

const main = async (): Promise<void> => {
  mkdirSync('.lighthouse', { recursive: true });
  const cookie = await sessionCookie(await seedFeed());
  const scores: number[] = [];
  for (let run = 1; run <= runs; run += 1) {
    const report = runLighthouse(cookie, path.resolve(`.lighthouse/feed-${run}.json`));
    const score = Math.round((report.categories.performance.score ?? 0) * 100);
    scores.push(score);
    const metrics = METRICS.map(id => `${id}=${report.audits[id]?.displayValue ?? '?'}`);
    console.log(`#${run} performans ${score} · ${metrics.join(' · ')}`);
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  console.log(`medyan ${median} (koşular: ${scores.join(', ')}; bütçe ≥ ${BUDGET * 100})`);
  if (median < BUDGET * 100) process.exitCode = 1;
};

await main();
