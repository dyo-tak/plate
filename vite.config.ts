import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config. We use HashRouter for routing, so the base path
// doesn't matter at runtime — it only affects the URL of the
// generated asset files in the production build. We default to
// './' for portability (works under any subpath or domain).
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
