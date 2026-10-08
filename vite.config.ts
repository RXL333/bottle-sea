import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { trailerVideoServer } from './src/core/capture/TrailerVideoServer';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [trailerVideoServer(projectRoot)],
  // GitHub Pages serves this project from /bottle-sea/. Local development
  // stays at / so the existing npm scripts keep their familiar URLs.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/bottle-sea/' : '/',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        farmAssets: resolve(projectRoot, 'farm-assets.html'),
      },
    },
  },
});
