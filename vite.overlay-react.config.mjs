import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    target: 'chrome110',
    outDir: resolve(import.meta.dirname, 'src/react'),
    emptyOutDir: false,
    copyPublicDir: false,
    sourcemap: false,
    minify: 'esbuild',
    lib: {
      entry: resolve(
        import.meta.dirname,
        'react-src/overlay/react-islands-entry.ts'
      ),
      formats: ['iife'],
      name: 'LumnoOverlayReactBundle',
      fileName: () => 'overlay-islands.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
