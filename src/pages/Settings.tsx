import { useState } from 'react'
import { syncStatus, connect, disconnect, syncNow, isDirty, type Provider } from '../sync'
import { useWorkspace } from '../state/workspace'

export function Settings() {
  const ws = useWorkspace()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [active, setActive] = useState<Provider | null>(syncStatus())

  async function handleConnect(p: Provider) {
    setBusy(true)
    setMsg('')
    try {
      await connect(p)
      setActive(syncStatus())
      setMsg('Connected. Plate now writes to a "Plate" folder in your Drive.')
    } catch (e) {
      const err = e as Error
      // Google auth errors often arrive as plain query params on the
      // redirect: ?error=access_denied&error_description=...
      // Surface the raw message verbatim so misconfigurations are obvious.
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleDisconnect() {
    disconnect()
    setActive(null)
    setMsg('Disconnected.')
  }

  async function handleSyncNow() {
    setBusy(true)
    setMsg('Syncing…')
    try {
      ws.setSyncStatus('syncing')
      const r = await syncNow()
      const tail = r.errors.length ? ` · ${r.errors.length} error(s)` : ''
      setMsg(`Pulled ${r.pulled}, pushed ${r.pushed}${tail}`)
      ws.setLastSync(Date.now())
      ws.setSyncStatus(r.errors.length ? 'error' : 'idle')
    } catch (e) {
      setMsg((e as Error).message)
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
        hint="Sync a 'Plate' folder in your Google Drive. One-way last-write-wins."
        active={active === 'gdrive'}
        busy={busy}
        onConnect={() => handleConnect('gdrive')}
        onDisconnect={handleDisconnect}
        showSync
        onSyncNow={handleSyncNow}
        dirty={isDirty()}
      />

      <DisabledCard
        label="OneDrive"
        hint="Coming next — Azure app registration required."
      />

      <DisabledCard
        label="GitHub"
        hint="Coming next — Personal Access Token or Cloudflare Worker for OAuth."
      />

      {msg && (
        <p className="mt-6 text-caption uppercase tracking-tight font-ui border-t border-hairline pt-4">
          ° {msg}
        </p>
      )}

      <hr className="my-12 border-hairline" />

      <p className="text-caption uppercase tracking-tight font-ui opacity-60">
        ° Tokens live in this browser only. No server. No telemetry.
      </p>
    </main>
  )
}

function ProviderCard({ label, hint, active, busy, onConnect, onDisconnect, showSync, onSyncNow, dirty }: {
  label: string; hint: string; active: boolean; busy: boolean
  onConnect: () => void; onDisconnect: () => void
  showSync?: boolean; onSyncNow?: () => void; dirty?: boolean
}) {
  return (
    <div className="border border-hairline rounded-xl p-6 mb-6 flex items-start justify-between gap-6">
      <div>
        <p className="text-subheading font-display">{label}</p>
        <p className="text-body opacity-60 mt-1">{hint}</p>
        {active && (
          <p className="text-caption uppercase tracking-tight mt-3 opacity-60">
            ° Connected{dirty ? ' · unsynced changes' : ''}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {active ? (
          <>
            {showSync && (
              <button
                onClick={onSyncNow}
                disabled={busy}
                className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-4 py-2 font-ui disabled:opacity-40"
              >
                Sync now
              </button>
            )}
            <button
              onClick={onDisconnect}
              disabled={busy}
              className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100 disabled:opacity-30"
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
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

function DisabledCard({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="border border-hairline rounded-xl p-6 mb-6 opacity-50">
      <p className="text-subheading font-display">{label}</p>
      <p className="text-body mt-1">{hint}</p>
    </div>
  )
}
