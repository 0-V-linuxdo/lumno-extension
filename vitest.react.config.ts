import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['react-src/**/*.test.ts', 'react-src/**/*.test.tsx'],
    setupFiles: ['react-src/test/setup.ts'],
    restoreMocks: true
  }
});
