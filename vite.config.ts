import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite config — base path is the deployed GitHub Pages subpath so that
// OAuth redirect URIs and asset URLs all resolve correctly at runtime.
// To deploy elsewhere, change this to '/' or './' and update the
// Google Cloud Console redirect URI to match.
const BASE = process.env.PLATE_BASE ?? '/plate/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: BASE,
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
