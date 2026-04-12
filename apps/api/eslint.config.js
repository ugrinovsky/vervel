import { configApp } from '@adonisjs/eslint-config'

/** PascalCase service modules (e.g. WorkoutCalculator) — filename matches exported class. */
export default configApp({
  name: 'app/services: allow PascalCase filenames',
  files: ['app/services/**/*.ts'],
  rules: {
    '@unicorn/filename-case': 'off',
  },
})
