import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Yerel test ayarları (ör. PW_CHROMIUM_EXECUTABLE); dosya gitignore'da, CI'da yok
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local');

// Yerelde önceden kurulu Chromium (ADR-0003 Karar 2); CI'da boş → Playwright'ın kendi tarayıcısı
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': fileURLToPath(new URL('./tests/setup/server-only.ts', import.meta.url)),
    },
  },
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    // Eşik yalnızca kritik saf modüllerde (ADR-0003): `npm run test:coverage`
    coverage: {
      provider: 'v8',
      include: ['src/lib/entities/**/*.ts'],
      exclude: ['**/*.test.ts', '**/test-utils.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        // Glob eşikleri üst düzey `perFile`'ı devralmaz; dosya bazında kontrol için burada.
        'src/lib/entities/**/*.ts': { lines: 95, branches: 95, perFile: true },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'tests/unit/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/*.browser.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          exclude: ['**/*.browser.test.tsx'],
          setupFiles: ['tests/setup/dom.ts'],
          // next-intl'in ESM'i `next/navigation`'ı uzantısız import eder; Node çözemez → Vite işlesin
          server: { deps: { inline: ['next-intl'] } },
        },
      },
      {
        // Gerçek Postgres ile DAL/Server Action testleri (ADR-0003 Karar 3): globalSetup şablon
        // DB'yi migration'larla kurar, setupFile her worker'a şablondan kopya DB verir.
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.int.test.ts', 'tests/integration/**/*.int.test.ts'],
          pool: 'forks',
          globalSetup: ['tests/db/global-setup.ts'],
          setupFiles: ['tests/db/setup-worker.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
      {
        // Yalnızca composer gibi gerçek tarayıcı gerektiren bileşenler (ADR-0003)
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { executablePath } }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
