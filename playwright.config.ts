import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Yerel test ayarları (ör. PW_CHROMIUM_EXECUTABLE); dosya gitignore'da, CI'da yok
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');

const isCI = Boolean(process.env.CI);
// Paralel worktree'lerde çakışmasın diye yerelde değiştirilebilir (.env.test.local: PW_PORT=3108)
const PORT = Number(process.env.PW_PORT) || 3100;
const baseURL = `http://localhost:${PORT}`;

// Yerelde önceden kurulu Chromium (ADR-0003 Karar 2); CI'da boş → `playwright install` tarayıcısı
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  workers: isCI ? 2 : undefined,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },
  // Yalnızca bir cihaza ait testler etiketle ayrılır (`{ tag: '@mobile' }`); etiketsizler ikisinde de koşar
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grepInvert: /@desktop/ },
  ],
  webServer: {
    // E2E kendi build'ini alır (ADR-0003); S5'te emulator env'i bu build'e eklenecek
    command: `npm run build:e2e && npx next start -p ${PORT}`,
    // `/dev/*` önizleme sayfaları (ör. composer) production build'inde yalnızca bu bayrakla açılır
    env: { ENABLE_DEV_PAGES: '1' },
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !isCI,
  },
});
