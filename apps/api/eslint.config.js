import { configApp } from '@adonisjs/eslint-config'

/** PascalCase service modules (e.g. WorkoutCalculator) — filename matches exported class. */
export default [
  {
    ignores: ['ace.js', 'tests/**', '**/*.mjs'],
  },
  ...configApp({
    name: 'app/services: allow PascalCase filenames',
    files: ['app/services/**/*.ts'],
    rules: {
      '@unicorn/filename-case': 'off',
    },
  }),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },
]
