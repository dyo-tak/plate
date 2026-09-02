// Service worker registration. Loaded eagerly in main.tsx so the PWA shell
// caches on first visit instead of waiting for a reload.
export function registerSW() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return // skip in dev — Vite HMR + SW caches fight

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('../public/sw.js', import.meta.url), { scope: './' })
      .catch((err) => console.warn('[plate] SW registration failed:', err))
  })
}
