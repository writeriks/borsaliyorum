import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

import featureBoundaries from './tools/eslint/feature-boundaries.mjs';

export default defineConfig([
  globalIgnores([
    'legacy/**',
    // Paralel agent worktree'leri (kendi dallarında lint'lenir)
    '.claude/**',
    '.next/**',
    // Yerel geçici dosyalar (gitignore'da: test Postgres'i, emulator yapılandırması)
    '.tmp/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'src/generated/**',
    'public/**',
  ]),
  ...nextVitals,
  ...nextTs,
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { local: { rules: { 'feature-boundaries': featureBoundaries } } },
    rules: {
      'local/feature-boundaries': 'error',
      // Kullanıcı içeriği düz metin; HTML enjeksiyonu yasak (coding-standards)
      'react/no-danger': 'error',
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/legacy/**', 'legacy/*'], message: 'legacy/ yalnızca referanstır.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='httpEquiv'][value.value=/refresh/i]",
          message: 'Meta refresh yasak; redirect() kullan.',
        },
      ],
      // eslint-disable yalnızca gerekçeyle: `// eslint-disable-next-line kural -- neden`
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
    },
  },
  {
    // Env yalnızca doğrulanmış erişimcilerden okunur (lib/env*.ts); ham erişim tip/doğrulama
    // dışı kalır ve sunucu değerinin istemci bundle'ına sızmasına yol açabilir.
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'process.env yerine getServerEnv()/getClientEnv() (src/lib/env*.ts) kullan.',
        },
      ],
    },
  },
  {
    files: [
      'src/lib/env*.ts',
      'src/lib/logger/**',
      'next.config.ts',
      '**/*.config.*',
      'scripts/**',
      // Test DB altyapısı ve seed, test DB URL'sini env'den okur; uygulama koduna girmez
      'prisma/**',
      'tests/db/**',
      'src/lib/db/*.int.test.ts',
      // Yalnız DATABASE_URL'yi şemayla doğrular; getServerEnv() Firebase env'i de ister
      'src/lib/db/index.ts',
      // Başlangıçta yalnızca emulator koruması; tam env doğrulaması istek anında
      'src/instrumentation.ts',
      // E2E altyapısı (emulator, test DB) test env'ini okur
      'tests/e2e/**',
    ],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  {
    // Kullanıcıya görünen metin JSX'e gömülmez; i18n'den gelir
    files: ['src/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: { 'react/jsx-no-literals': ['error', { noStrings: false, ignoreProps: true }] },
  },
  {
    files: ['**/*.mjs', '**/*.js'],
    ...js.configs.recommended,
    languageOptions: { globals: globals.node },
  },
  prettier,
]);
