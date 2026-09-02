// Sync layer — adapter pattern over three providers.
//
// Public API:
//   syncStatus()                          -> Provider | null
//   connect(provider)                     -> opens OAuth popup, stores token
//   disconnect()                          -> clears stored creds
//   pull(provider): Promise<RemoteFile[]> -> fetch remote listing
//   push(provider, file): Promise<void>   -> upload a single file
//
// Tokens live in localStorage (the simplest PKCE-friendly storage in a SPA).
// For production-hardened security, swap to IndexedDB + non-extractable.

export type Provider = 'github' | 'gdrive' | 'onedrive'

const KEY = 'plate.sync.active'

export function syncStatus(): Provider | null {
  const v = localStorage.getItem(KEY)
  if (v === 'github' || v === 'gdrive' || v === 'onedrive') return v
  return null
}

export function connect(provider: Provider) {
  localStorage.setItem(KEY, provider)
  // Open the provider's auth page in a popup. The redirect URI is a
  // /sync/callback page inside this app that posts the code back to us.
  const url = authUrl(provider)
  const w = window.open(url, 'plate-auth', 'width=520,height=720')
  if (!w) throw new Error('Popup blocked. Allow popups for this site to connect sync.')
  return waitForAuth()
}

export function disconnect() {
  localStorage.removeItem(KEY)
  localStorage.removeItem('plate.sync.token')
}

export type RemoteFile = {
  path: string
  sha: string
  body: string
}

function authUrl(p: Provider): string {
  // Each provider gets its own OAuth config. In a real deployment these
  // client IDs come from .env at build time. For the dev scaffold we wire
  // placeholders so the wiring is visible end-to-end.
  const redirect = `${location.origin}/sync/callback`
  switch (p) {
    case 'github':
      return `https://github.com/login/oauth/authorize?client_id=${import.meta.env.VITE_GH_CLIENT_ID ?? 'PLACEHOLDER'}&scope=repo&redirect_uri=${encodeURIComponent(redirect)}`
    case 'gdrive':
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID ?? 'PLACEHOLDER'}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&redirect_uri=${encodeURIComponent(redirect)}`
    case 'onedrive':
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${import.meta.env.VITE_MS_CLIENT_ID ?? 'PLACEHOLDER'}&response_type=token&scope=${encodeURIComponent('Files.ReadWrite offline_access')}&redirect_uri=${encodeURIComponent(redirect)}`
  }
}

function waitForAuth(): Promise<void> {
  return new Promise((resolve) => {
    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === 'plate-auth-ok') {
        window.removeEventListener('message', onMessage)
        resolve()
      }
    }
    window.addEventListener('message', onMessage)
  })
}

// -- Adapters --
// Each adapter exposes the same shape: list, read, write.

import { githubAdapter } from './adapters/github'
import { gdriveAdapter } from './adapters/gdrive'
import { onedriveAdapter } from './adapters/onedrive'

const adapters = {
  github: githubAdapter,
  gdrive: gdriveAdapter,
  onedrive: onedriveAdapter,
} as const

export async function pull(provider: Provider): Promise<RemoteFile[]> {
  const token = localStorage.getItem('plate.sync.token')
  if (!token) throw new Error('Not connected. Call connect() first.')
  return adapters[provider].list(token)
}

export async function push(provider: Provider, file: RemoteFile): Promise<void> {
  const token = localStorage.getItem('plate.sync.token')
  if (!token) throw new Error('Not connected. Call connect() first.')
  return adapters[provider].write(token, file)
}
