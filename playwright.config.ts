import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

// Yerel test ayarları (ör. PW_CHROMIUM_EXECUTABLE); dosya gitignore'da, CI'da yok
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');

const { AUTH_EMULATOR_PORT, E2E_BASE_URL, e2eServerEnv } = await import('./tests/e2e/support/env');

const isCI = Boolean(process.env.CI);

// Yerelde önceden kurulu Chromium (ADR-0003 Karar 2); CI'da boş → `playwright install` tarayıcısı
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  workers: isCI ? 2 : undefined,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: E2E_BASE_URL,
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
  webServer: [
    {
      // Firebase Auth emulator (demo- projesi; gerçek Firebase'e bağlanmaz)
      command: 'node scripts/e2e-emulator.mjs',
      url: `http://127.0.0.1:${AUTH_EMULATOR_PORT}/`,
      timeout: 180_000,
      reuseExistingServer: !isCI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // E2E kendi build'ini alır (ADR-0003): emulator adresi NEXT_PUBLIC_* olarak gömülür
      command: 'npm run build:e2e && npm run start:e2e',
      url: E2E_BASE_URL,
      timeout: 300_000,
      reuseExistingServer: !isCI,
      env: e2eServerEnv(),
    },
  ],
});
