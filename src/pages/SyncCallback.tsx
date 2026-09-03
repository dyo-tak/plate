// /sync/callback — OAuth landing. Two flavors:
//   - Implicit flow (Google): returns token in URL fragment (#access_token=...)
//   - Auth code flow (others): returns ?code=... (exchange happens elsewhere)
//
// We post a message shaped for the specific provider so each adapter
// can react with the right field names.

import { useEffect } from 'react'

export default function SyncCallback() {
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.slice(1))
    const provider = params.get('provider') ?? 'generic'
    const error = params.get('error') ?? hash.get('error') ?? ''

    if (error) {
      finishWithError(provider, error)
      return
    }

    if (provider === 'gdrive') {
      const accessToken = hash.get('access_token')
      const expiresIn = parseInt(hash.get('expires_in') ?? '3600', 10)
      if (!accessToken) {
        finishWithError(provider, 'No access token in response.')
        return
      }
      localStorage.setItem('plate.sync.gdrive.token', accessToken)
      localStorage.setItem('plate.sync.gdrive.expires', String(Date.now() + expiresIn * 1000))
      localStorage.setItem('plate.sync.active', 'gdrive')
      post({ type: 'plate-gdrive-auth', accessToken, expiresIn })
      closeOrRedirect()
      return
    }

    // Generic: pass the code/token back
    const code = params.get('code')
    const token = hash.get('access_token')
    const value = token ?? code ?? ''
    if (value) {
      localStorage.setItem('plate.sync.token', value)
      post({ type: 'plate-auth-ok', value })
      closeOrRedirect()
    } else {
      // Nothing to do
      location.replace('/settings')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center section-paper font-ui">
      <p className="text-subheading font-display opacity-60">Closing connection…</p>
    </div>
  )
}

function post(msg: Record<string, unknown>) {
  if (window.opener) {
    window.opener.postMessage(msg, location.origin)
  }
}

function closeOrRedirect() {
  if (window.opener) {
    setTimeout(() => window.close(), 100)
  } else {
    setTimeout(() => location.replace('/settings'), 100)
  }
}

function finishWithError(provider: string, error: string) {
  if (window.opener) {
    window.opener.postMessage({ type: 'plate-gdrive-auth', error: `${provider}: ${error}` }, location.origin)
    setTimeout(() => window.close(), 100)
  } else {
    setTimeout(() => location.replace('/settings'), 100)
  }
}
