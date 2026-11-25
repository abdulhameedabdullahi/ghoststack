import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { BASE_PATH, MANIFEST } from './src/pwa/manifestConfig';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // a new worker waits; no skipWaiting
      injectRegister: false, // src/pwa/registerServiceWorker.ts registers it
      strategies: 'generateSW',
      scope: BASE_PATH,
      base: BASE_PATH,
      manifest: MANIFEST,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,ttf,woff,woff2}'],
        navigateFallback: `${BASE_PATH}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
