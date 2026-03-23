import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from '@svgr/rollup';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [react(), tailwindcss(), svgr({ dimensions: true, svgo: false, typescript: false })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        sw: path.resolve(__dirname, 'src/sw.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
