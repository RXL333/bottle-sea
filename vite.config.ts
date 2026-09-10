import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project from /bottle-sea/. Local development
  // stays at / so the existing npm scripts keep their familiar URLs.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/bottle-sea/' : '/',
  build: {
    chunkSizeWarningLimit: 700,
  },
});
