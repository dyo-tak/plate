// /sync/callback — OAuth landing for the implicit flow.
// Receives the token (or error) in the URL fragment, posts it back to
// the opener, and closes the popup. With HashRouter, we redirect to
// `/#/settings` so the popup (if it has no opener) lands in a known
// place rather than 404'ing.

import { useEffect, useState } from 'react'

export default function SyncCallback() {
  const [info, setInfo] = useState<string>('Closing connection…')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.slice(1))
    const provider = params.get('provider') ?? 'generic'

    // Google errors come back in the QUERY string (?error=...),
    // not the fragment. The token comes back in the FRAGMENT.
    const queryError = params.get('error')
    const queryErrorDesc = params.get('error_description')
    const fragmentError = hash.get('error')

    if (queryError || fragmentError) {
      const desc = queryErrorDesc ?? fragmentError ?? ''
      const msg = queryError ? `Google: ${queryError}${desc ? ` — ${desc}` : ''}` : `Auth: ${fragmentError}`
      setInfo(msg)
      if (window.opener) {
        window.opener.postMessage({ type: 'plate-gdrive-auth', error: msg }, location.origin)
        setTimeout(() => window.close(), 2500)
      } else {
        setTimeout(() => location.replace(targetPath()), 2500)
      }
      return
    }

    if (provider === 'gdrive') {
      const accessToken = hash.get('access_token')
      const expiresIn = parseInt(hash.get('expires_in') ?? '3600', 10)
      if (!accessToken) {
        const msg = 'No access_token in the response from Google.'
        setInfo(msg)
        if (window.opener) {
          window.opener.postMessage({ type: 'plate-gdrive-auth', error: msg }, location.origin)
          setTimeout(() => window.close(), 2500)
        } else {
          setTimeout(() => location.replace(targetPath()), 2500)
        }
        return
      }
      localStorage.setItem('plate.sync.gdrive.token', accessToken)
      localStorage.setItem('plate.sync.gdrive.expires', String(Date.now() + expiresIn * 1000))
      localStorage.setItem('plate.sync.active', 'gdrive')
      setInfo('Connected. Closing…')
      if (window.opener) {
        window.opener.postMessage({ type: 'plate-gdrive-auth', accessToken, expiresIn }, location.origin)
        setTimeout(() => window.close(), 300)
      } else {
        setTimeout(() => location.replace(targetPath()), 300)
      }
      return
    }

    // Generic (auth-code flow reserved for future providers)
    const code = params.get('code')
    const token = hash.get('access_token')
    const value = token ?? code ?? ''
    if (value) {
      localStorage.setItem('plate.sync.token', value)
      setInfo('Connected. Closing…')
      if (window.opener) {
        window.opener.postMessage({ type: 'plate-auth-ok', value }, location.origin)
        setTimeout(() => window.close(), 300)
      } else {
        setTimeout(() => location.replace(targetPath()), 300)
      }
    } else {
      setInfo('Nothing to do — returning to settings.')
      setTimeout(() => location.replace(targetPath()), 1500)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center section-paper font-ui px-6">
      <p className="text-subheading font-display opacity-80 text-center max-w-md">{info}</p>
    </div>
  )
}

// After the popup closes (or if there was no opener), send the user to
// the Settings page. The router's basename is wired in main.tsx so
// the path is relative to /plate/ in production.
function targetPath(): string {
  return `${import.meta.env.BASE_URL || './'}settings`
}
