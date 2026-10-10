import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { BRAND_NAME } from './src/config/brand.ts';

// Deploy-target-agnostic: VITE_BASE sets the public base path ('/' for a root deploy,
// '/Merge_Game1/' for GitHub Pages, './' for a relative bundle). Default '/'.
const base = process.env.VITE_BASE ?? '/';

const DESCRIPTION =
  'A gentle physics merge game: gather scattered light and restore colour to the lands.';

/** Absolute URL of the deployed game (set by the deploy workflow), for link previews. */
const publicUrl = process.env.VITE_PUBLIC_URL;

/** Writes the real title, a description and link-preview tags into index.html at build time, so
 *  a shared link shows the game's name and icon instead of "Loading…". */
function shareMeta(): Plugin {
  return {
    name: 'share-meta',
    transformIndexHtml(html) {
      const tags = [
        `<meta name="description" content="${DESCRIPTION}" />`,
        '<meta property="og:type" content="website" />',
        `<meta property="og:title" content="${BRAND_NAME}" />`,
        `<meta property="og:description" content="${DESCRIPTION}" />`,
        '<meta name="twitter:card" content="summary" />',
      ];
      if (publicUrl) {
        tags.push(
          `<meta property="og:url" content="${publicUrl}" />`,
          `<meta property="og:image" content="${new URL('icons/icon-512.png', publicUrl).href}" />`,
        );
      }
      return html.replace(
        '<title>Loading…</title>',
        `<title>${BRAND_NAME}</title>\n    ${tags.join('\n    ')}`,
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    shareMeta(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: BRAND_NAME,
        short_name: BRAND_NAME,
        description: DESCRIPTION,
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
        // the painted art (public/assets/**/*.webp) is precached so the game plays offline
        globPatterns: ['**/*.{js,css,html,svg,png,webp,wasm,woff2}'],
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
