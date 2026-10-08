import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build für eine Einzelseite (claude.ai-Artifact): ein JS-Bundle ohne
// Code-Splitting, kein Service Worker, pdf.js-Worker als separate Datei.
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('..'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'virtual:pwa-register', replacement: here('./pwaRegisterStub.ts') },
      { find: /^.*\/pdfWorker$/, replacement: here('./pdfWorker.ts') },
    ],
  },
  build: {
    outDir: here('../dist-artifact'),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
