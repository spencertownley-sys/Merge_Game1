import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.worker,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Determinism guardrail (CLAUDE.md "Gotchas"): Math.random anywhere in the
      // physics/spawn path silently breaks seeded fairness. engine/rng.ts is the
      // one place allowed to touch it — see the override below.
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Do not call Math.random() outside src/engine/rng.ts — it breaks seeded determinism (game design doc §4).',
        },
      ],
    },
  },
  {
    files: ['src/engine/rng.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
  prettierConfig,
];
