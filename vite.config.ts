
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'sw.js',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'PhysioTrack Pro',
        short_name: 'PhysioTrack',
        description: 'Real-time Physical Therapy Management System',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%230f172a'/%3E%3Cpath fill='%23ffffff' d='M140 112h80c53 0 96 43 96 96s-43 96-96 96h-32v96h-48V112zm48 48v96h32c26.5 0 48-21.5 48-48s-21.5-48-48-48h-32z'/%3E%3Cpath fill='%2338bdf8' d='M310 112h110v48h-31v240h-48v-240h-31z'/%3E%3C/svg%3E",
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%230f172a'/%3E%3Cpath fill='%23ffffff' d='M140 112h80c53 0 96 43 96 96s-43 96-96 96h-32v96h-48V112zm48 48v96h32c26.5 0 48-21.5 48-48s-21.5-48-48-48h-32z'/%3E%3Cpath fill='%2338bdf8' d='M310 112h110v48h-31v240h-48v-240h-31z'/%3E%3C/svg%3E",
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='128' fill='%230f172a'/%3E%3Cpath fill='%23ffffff' d='M140 112h80c53 0 96 43 96 96s-43 96-96 96h-32v96h-48V112zm48 48v96h32c26.5 0 48-21.5 48-48s-21.5-48-48-48h-32z'/%3E%3Cpath fill='%2338bdf8' d='M310 112h110v48h-31v240h-48v-240h-31z'/%3E%3C/svg%3E",
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react']
        }
      }
    }
  }
});
