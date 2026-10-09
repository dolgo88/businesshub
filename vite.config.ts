import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relativa: funciona en GitHub Pages (/businesshub/) y en local sin cambios.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: { charts: ['recharts'] },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'apps-script/**/*.test.ts'],
    environment: 'node',
  },
});
