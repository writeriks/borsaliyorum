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
    '.next/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'prisma/**',
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
