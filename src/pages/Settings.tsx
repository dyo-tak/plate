import { useState, useEffect } from 'react'
import { syncStatus, connect, disconnect, syncNow, isDirty, type Provider } from '../sync'
import { useWorkspace } from '../state/workspace'

export function Settings() {
  const ws = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'err' | 'info' }>({ text: '', tone: 'info' })
  const [active, setActive] = useState<Provider | null>(syncStatus())

  // Re-check active state on every render in case the OAuth flow
  // completed in another window/tab
  useEffect(() => { setActive(syncStatus()) }, [])

  async function handleConnect(p: Provider) {
    setBusy(true)
    setMsg({ text: 'Opening Google sign-in…', tone: 'info' })
    try {
      await connect(p)
      setActive(syncStatus())
      setMsg({ text: 'Connected. Notes will sync to a "Plate" folder in your Google Drive.', tone: 'ok' })
    } catch (e) {
      const err = e as Error
      setMsg({ text: `Could not connect: ${err.message}`, tone: 'err' })
    } finally {
      setBusy(false)
    }
  }

  function handleDisconnect() {
    disconnect()
    setActive(null)
    setMsg({ text: 'Disconnected. Your notes remain on this device.', tone: 'info' })
  }

  async function handleSyncNow() {
    setBusy(true)
    setMsg({ text: 'Syncing…', tone: 'info' })
    try {
      ws.setSyncStatus('syncing')
      const r = await syncNow()
      const tail = r.errors.length ? ` · ${r.errors.length} error(s): ${r.errors[0]}` : ''
      setMsg({ text: `Synced. Pulled ${r.pulled} · pushed ${r.pushed}${tail}`, tone: r.errors.length ? 'err' : 'ok' })
      ws.setLastSync(Date.now())
      ws.setSyncStatus(r.errors.length ? 'error' : 'idle')
    } catch (e) {
      setMsg({ text: `Sync failed: ${(e as Error).message}`, tone: 'err' })
      ws.setSyncStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="px-6 md:px-10 py-8 section-paper min-h-[70vh] max-w-3xl">
      <h1 className="font-display text-heading text-headline-ink mb-2">Settings</h1>
      <p className="text-subheading font-display opacity-60 mb-12">
        Connect a sync provider. Your notes stay on this device until you do.
      </p>

      {/* Google Drive — fully wired */}
      <ProviderCard
        label="Google Drive"
        description="Notes sync to a 'Plate' folder in your Google Drive. The app can only see files it created — your other Drive content is private."
        scope="drive.file"
        active={active === 'gdrive'}
        busy={busy}
        dirty={isDirty()}
        onConnect={() => handleConnect('gdrive')}
        onDisconnect={handleDisconnect}
        onSyncNow={handleSyncNow}
      />

      <DisabledProviderCard
        label="OneDrive"
        description="Coming soon. Will sync a 'Plate' folder in your OneDrive using your Microsoft account."
      />

      <DisabledProviderCard
        label="GitHub"
        description="Coming soon. Will sync notes as markdown files in a GitHub repository."
      />

      {msg.text && (
        <div
          className={[
            'mt-8 px-4 py-3 border rounded-xl font-ui',
            msg.tone === 'ok' ? 'border-headline-ink' : '',
            msg.tone === 'err' ? 'border-headline-ink bg-headline-ink text-paper' : '',
            msg.tone === 'info' ? 'border-hairline' : '',
          ].join(' ')}
        >
          <p className="text-body break-words">{msg.text}</p>
        </div>
      )}

      <hr className="my-12 border-hairline" />

      <div className="space-y-2 text-caption uppercase tracking-tight font-ui opacity-60">
        <p>° Tokens live in this browser only. No server. No telemetry.</p>
        <p>° Reset: clear browser data to forget all sync state.</p>
      </div>
    </main>
  )
}

function ProviderCard({ label, description, scope, active, busy, dirty, onConnect, onDisconnect, onSyncNow }: {
  label: string
  description: string
  scope: string
  active: boolean
  busy: boolean
  dirty: boolean
  onConnect: () => void
  onDisconnect: () => void
  onSyncNow: () => void
}) {
  return (
    <div className="border border-headline-ink rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <p className="text-subheading font-display">{label}</p>
            {active && (
              <span className="text-caption uppercase tracking-tight font-ui border border-headline-ink rounded-xl px-2 py-0.5">
                Connected
              </span>
            )}
          </div>
          <p className="text-body opacity-70 mt-1">{description}</p>
          <p className="text-caption uppercase tracking-tight font-ui opacity-50 mt-2">
            ° scope: {scope}
            {dirty && active ? ' · unsynced changes' : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {active ? (
          <>
            <button
              onClick={onSyncNow}
              disabled={busy}
              className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-4 py-2 font-ui hover:bg-headline-ink hover:text-paper transition-colors disabled:opacity-40"
            >
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              onClick={onDisconnect}
              disabled={busy}
              className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100 disabled:opacity-30 px-3 py-2"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            disabled={busy}
            className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-4 py-2 font-ui hover:bg-headline-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            {busy ? 'Opening…' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  )
}

function DisabledProviderCard({ label, description }: { label: string; description: string }) {
  return (
    <div className="border border-hairline rounded-xl p-6 mb-6 opacity-50">
      <p className="text-subheading font-display">{label}</p>
      <p className="text-body mt-1">{description}</p>
    </div>
  )
}
