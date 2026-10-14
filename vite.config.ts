import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// GitHub Pages sirve el sitio en /<repo>/
const BASE = '/WEFA-CHAMPIONS-NICS/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'WEFA Champions NICS',
        short_name: 'WEFA NICS',
        description: 'Plantilla, sorteo de equipos equilibrados e historial de la WEFA Champions NICS.',
        lang: 'es',
        theme_color: '#070a18',
        background_color: '#070a18',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}'],
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Los himnos se cachean bajo demanda, no en la instalación
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'anthems',
              rangeRequests: true,
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Firebase pesa ~800 kB; se sirve con gzip (~350 kB) y queda cacheado por el service worker
    chunkSizeWarningLimit: 1300,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}))
