import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DocuFlow',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies || {}),
        'fs',
        'path',
        'fs/promises',
        'child_process',
        'url',
        'module',
        'events',
        'stream',
        'util', // Node built-ins
        'node:fs',
        'node:path',
        'node:child_process',
        'node:url',
        'node:module',
      ],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    target: 'node18',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    ssr: true, // Helpful for node builds sometimes, or just target node
  },
  plugins: [dts({ rollupTypes: true, include: ['src'] })],
});
