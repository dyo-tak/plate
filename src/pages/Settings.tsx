import { useState } from 'react'
import { useVault } from '../hooks/useVault'
import { syncStatus, connect, disconnect, type Provider } from '../sync'

export function Settings() {
  const { lastSync } = useVault()
  const [active, setActive] = useState<Provider | null>(syncStatus())

  async function handleConnect(p: Provider) {
    await connect(p)
    setActive(syncStatus())
  }

  function handleDisconnect() {
    disconnect()
    setActive(null)
  }

  const providers: { id: Provider; label: string; hint: string }[] = [
    { id: 'github', label: 'GitHub', hint: 'Sync a repo as the source of truth.' },
    { id: 'gdrive', label: 'Google Drive', hint: 'Sync a folder in your Drive.' },
    { id: 'onedrive', label: 'OneDrive', hint: 'Sync a folder in your OneDrive.' },
  ]

  return (
    <main className="px-6 md:px-10 py-8 section-paper min-h-[70vh] max-w-3xl">
      <h1 className="font-display text-heading text-headline-ink mb-2">Settings</h1>
      <p className="text-subheading font-display opacity-60 mb-12">
        Connect a sync provider. Your notes stay on this device until you do.
      </p>

      <div className="space-y-6">
        {providers.map((p) => (
          <div
            key={p.id}
            className="border border-hairline rounded-xl p-6 flex items-start justify-between gap-6"
          >
            <div>
              <p className="text-subheading font-display">{p.label}</p>
              <p className="text-body opacity-60 mt-1">{p.hint}</p>
              {active === p.id && (
                <p className="text-caption uppercase tracking-tight mt-3 opacity-60">
                  ° Connected · last sync{' '}
                  {lastSync ? new Date(lastSync).toLocaleString() : '—'}
                </p>
              )}
            </div>
            <div>
              {active === p.id ? (
                <button
                  onClick={handleDisconnect}
                  className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-4 py-2 font-ui"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(p.id)}
                  className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-4 py-2 font-ui hover:bg-headline-ink hover:text-paper transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <hr className="my-12 border-hairline" />

      <p className="text-caption uppercase tracking-tight font-ui opacity-60">
        ° Tokens live in this browser only. No server. No telemetry.
      </p>
    </main>
  )
}
