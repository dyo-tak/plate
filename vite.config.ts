import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// PWA-friendly Vite config. We generate the manifest + service worker
// manually (see public/) instead of using vite-plugin-pwa, so the build
// stays portable to any static host (GitHub Pages, Tailscale, local).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
