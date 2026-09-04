import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { registerSW } from './pwa.ts'

// BrowserRouter with basename = Vite's BASE_URL. This makes the app
// work whether it's mounted at /plate/ (production) or / (dev) without
// exposing a hash in the URL. The GitHub Pages deploy workflow ships
// 404.html as a copy of index.html, so unknown paths still load the SPA.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Register the service worker (no-op in dev, active in production builds).
registerSW()
