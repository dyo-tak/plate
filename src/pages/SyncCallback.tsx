// /sync/callback — receives the OAuth response, posts the code/token back
// to the opener, and closes the popup. Lives at a top-level route so the
// redirect_uri registered with each provider matches.

import { useEffect } from 'react'

export default function SyncCallback() {
  useEffect(() => {
    // Two flavors of OAuth:
    //  - GitHub returns ?code=... (server-side exchange needed; left to
    //    the backend in production — for the scaffold we forward code).
    //  - Google/MS return #access_token=... in the fragment.
    const params = new URLSearchParams(location.search)
    const hash = new URLSearchParams(location.hash.slice(1))
    const code = params.get('code')
    const token = hash.get('access_token')
    const value = token ?? code ?? ''

    if (window.opener) {
      window.opener.postMessage({ type: 'plate-auth-ok', value }, location.origin)
      window.close()
    } else {
      // No opener: just persist the token and bounce home.
      if (value) localStorage.setItem('plate.sync.token', value)
      location.replace('/')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center section-paper font-ui">
      <p className="text-subheading font-display opacity-60">Closing connection…</p>
    </div>
  )
}
