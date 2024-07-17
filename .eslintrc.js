module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  settings: {
    react: { version: '18.2.0' },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  parser: '@typescript-eslint/parser',
  plugins: ['react', 'jest', '@typescript-eslint', 'import'],
  rules: {
    'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'react/function-component-definition': ['error', { namedComponents: ['arrow-function'] }],
    'react/jsx-key': ['error'],

    // to fix false positive of no-shadow rule with ENUMs - https://github.com/typescript-eslint/typescript-eslint/issues/2483
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',

    // to fix false positive of no-use-before-define while importing React - https://github.com/typescript-eslint/typescript-eslint/issues/2502
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],

    'class-methods-use-this': 'off',
    'no-await-in-loop': 'off',

    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { varsIgnorePattern: 'React|^_', argsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // enable the rules specifically for TypeScript files
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
        'no-undef': 'off',
      },
    },
  ],
};
