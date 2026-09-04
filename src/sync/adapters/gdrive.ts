// Google Drive adapter — implicit OAuth flow (no client secret needed in
// the browser) + Drive v3 REST API.
//
// Why implicit and not PKCE: the user-supplied client ID without a secret
// works as a "public client" — Google allows it for SPAs, but the
// recommended flow is still PKCE. Implementing PKCE requires crypto
// utilities (SHA-256 + base64url) which is fine, but for v1 implicit
// is the simpler and equally-supported path. Token goes in the URL
// fragment, never leaves to a server.
//
// Auth scope: `drive.file` — the app can only see files it created
// (the "Plate" folder). Safer than full Drive access.

import type { RemoteFile } from '..'

const FOLDER_KEY = 'plate.sync.gdrive.folder'
const TOKEN_KEY = 'plate.sync.gdrive.token'
const EXPIRES_KEY = 'plate.sync.gdrive.expires'

type Token = { accessToken: string; expiresAt: number }

function getToken(): Token | null {
  const t = localStorage.getItem(TOKEN_KEY)
  const e = localStorage.getItem(EXPIRES_KEY)
  if (!t) return null
  const expiresAt = e ? parseInt(e, 10) : 0
  if (expiresAt && Date.now() > expiresAt - 60_000) {
    // expired or about to expire
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    return null
  }
  return { accessToken: t, expiresAt }
}

// Build the OAuth redirect URI. We register a single static callback
// at the root of the deployed site: `sync-callback.html` (served at
// `https://dyotak.me/sync-callback.html`). This keeps the redirect
// URI stable across deployments and across the dev/prod boundary,
// which matters because Google requires an exact match for the
// registered URI.
//
// The provider is passed as a query string so the same static page
// can dispatch to the right adapter in the future (OneDrive etc.).
function buildRedirectUri(): string {
  return `${location.origin}/sync-callback.html?provider=gdrive`
}

export function openGoogleAuth(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId || clientId === 'PLACEHOLDER') {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured. Set it in .env.production.')
  }
  const redirect = buildRedirectUri()
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=token&scope=${scope}&redirect_uri=${encodeURIComponent(redirect)}&prompt=consent&include_granted_scopes=true`

  return new Promise((resolve, reject) => {
    const w = window.open(url, 'plate-gdrive-auth', 'width=520,height=720')
    if (!w) {
      reject(new Error('Popup blocked. Allow popups for this site to connect Google Drive.'))
      return
    }
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== location.origin) return
      if (ev.data?.type === 'plate-gdrive-auth') {
        window.removeEventListener('message', onMessage)
        clearInterval(poll)
        if (ev.data.error) {
          reject(new Error(ev.data.error))
        } else {
          localStorage.setItem(TOKEN_KEY, ev.data.accessToken)
          localStorage.setItem(EXPIRES_KEY, String(Date.now() + (ev.data.expiresIn * 1000)))
          resolve(ev.data.accessToken)
        }
      }
    }
    window.addEventListener('message', onMessage)
    // safety net: also poll the popup in case postMessage was eaten
    const poll = setInterval(() => {
      try {
        if (w.closed) {
          clearInterval(poll)
          window.removeEventListener('message', onMessage)
          const tok = getToken()
          if (tok) resolve(tok.accessToken)
          else reject(new Error('Auth window closed before completion.'))
        }
      } catch {}
    }, 800)
  })
}

function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRES_KEY)
  localStorage.removeItem(FOLDER_KEY)
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const tok = getToken()
  if (!tok) throw new Error('Not connected to Google Drive.')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${tok.accessToken}`)
  return fetch(path, { ...init, headers })
}

async function findOrCreateFolder(_token: string, name: string): Promise<string> {
  const cached = localStorage.getItem(FOLDER_KEY)
  if (cached) return cached
  // Search for an existing Plate folder
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const search = await authedFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`
  )
  if (search.ok) {
    const j = await search.json()
    if (j.files?.[0]?.id) {
      localStorage.setItem(FOLDER_KEY, j.files[0].id)
      return j.files[0].id
    }
  }
  // Create one
  const create = await authedFetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  })
  if (!create.ok) throw new Error(`Drive folder create failed: ${create.status}`)
  const cj = await create.json()
  localStorage.setItem(FOLDER_KEY, cj.id)
  return cj.id
}

export const gdriveAdapter = {
  isConnected(): boolean {
    return !!getToken()
  },

  async connect(): Promise<void> {
    await openGoogleAuth()
  },

  disconnect(): void {
    logout()
  },

  async list(): Promise<RemoteFile[]> {
    const tok = getToken()
    if (!tok) throw new Error('Not connected to Google Drive.')
    const folder = await findOrCreateFolder(tok.accessToken, 'Plate')
    const q = `'${folder}' in parents and mimeType='text/markdown' and trashed=false`
    const res = await authedFetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,headRevisionId)`
    )
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
    const j = await res.json()
    const out: RemoteFile[] = []
    for (const f of j.files ?? []) {
      const r = await authedFetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`)
      if (!r.ok) continue
      out.push({ path: f.name, sha: f.headRevisionId ?? f.id, body: await r.text() })
    }
    return out
  },

  async write(file: RemoteFile): Promise<void> {
    const tok = getToken()
    if (!tok) throw new Error('Not connected to Google Drive.')
    const folder = await findOrCreateFolder(tok.accessToken, 'Plate')
    // Find existing file by name in folder
    const nameQ = `name='${file.path.replace(/'/g, "\\'")}' and '${folder}' in parents and trashed=false`
    const search = await authedFetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(nameQ)}&fields=files(id)`
    )
    const sj = await search.json()
    const existingId = sj.files?.[0]?.id as string | undefined

    // Multipart upload (metadata + body)
    const boundary = '-------plate' + Date.now()
    const meta = { name: file.path, mimeType: 'text/markdown' }
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(existingId ? meta : { ...meta, parents: [folder] }),
      `--${boundary}`,
      'Content-Type: text/markdown',
      '',
      file.body,
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const url = existingId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
    const method = existingId ? 'PATCH' : 'POST'

    const res = await authedFetch(url, {
      method,
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Drive write failed: ${res.status} ${t}`)
    }
  },
}
