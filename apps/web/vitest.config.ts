import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Только для `vitest run`: не импортирует основной vite.config (PWA/React/Tailwind/SVGR).
 * Иначе старт тестов часто «висит» в Cursor/CI и у разработчиков.
 */
export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
