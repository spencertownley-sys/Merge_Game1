import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { BRAND_NAME } from './src/config/brand.ts';

// Deploy-target-agnostic: VITE_BASE sets the public base path ('/' for a root deploy,
// '/Merge_Game1/' for GitHub Pages, './' for a relative bundle). Default '/'.
const base = process.env.VITE_BASE ?? '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: BRAND_NAME,
        short_name: BRAND_NAME,
        description:
          'A gentle physics merge game: gather scattered light and restore colour to the lands.',
        theme_color: '#faf7f2',
        background_color: '#faf7f2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // Rapier's embedded wasm makes the worker chunk large
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/determinism/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
  },
});
