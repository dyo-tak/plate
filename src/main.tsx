import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { registerSW } from './pwa.ts'

// HashRouter (not BrowserRouter) — GitHub Pages for project sites
// cannot reliably serve index.html for unknown subpaths, which makes
// BrowserRouter's "fresh page load on /settings" fail with a 404.
// HashRouter routes everything after `#/`, so the only real URL the
// server ever sees is the root index, and we never need an SPA
// fallback file.
//
//   https://dyotak.me/plate/#/settings
//   https://dyotak.me/plate/#/notes
//
// All internal <Link> and useNavigate() calls just change the hash
// (no server round-trip) so the redirect-URI issue we had earlier
// is gone too: the redirect target is the literal app root.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

// Register the service worker (no-op in dev, active in production builds).
registerSW()
