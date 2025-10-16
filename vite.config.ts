import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest: manifest as any }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        offscreen: 'src/offscreen/offscreen.html',
      },
    },
  },
  worker: {
    format: 'es',
  },
});

