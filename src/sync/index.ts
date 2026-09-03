// Sync layer — provider-agnostic interface over the three adapters.
// Each adapter owns its own auth flow now (the Settings page just calls
// `adapter.connect()`); the index module coordinates: which one is
// active, status, and the pull/push primitives.
//
// Tokens live in localStorage (or IndexedDB later). The Settings page
// surfaces the active provider, lets the user disconnect, and triggers
// a manual "Sync now" that pulls remote → merges → vault, then pushes
// vault → remote for anything dirty.

export type Provider = 'github' | 'gdrive' | 'onedrive'

const ACTIVE_KEY = 'plate.sync.active'
const DIRTY_KEY = 'plate.sync.dirty'

export function syncStatus(): Provider | null {
  const v = localStorage.getItem(ACTIVE_KEY)
  if (v === 'github' || v === 'gdrive' || v === 'onedrive') return v
  return null
}

function setActive(p: Provider | null) {
  if (p) localStorage.setItem(ACTIVE_KEY, p)
  else localStorage.removeItem(ACTIVE_KEY)
}

import { gdriveAdapter } from './adapters/gdrive'
// import { githubAdapter } from './adapters/github'
// import { onedriveAdapter } from './adapters/onedrive'

const adapters = {
  gdrive: gdriveAdapter,
  // github: githubAdapter,
  // onedrive: onedriveAdapter,
} as const

type WiredProvider = keyof typeof adapters

function isWired(p: Provider): p is WiredProvider {
  return p in adapters
}

export type RemoteFile = {
  path: string
  sha: string
  body: string
}

export async function connect(provider: Provider): Promise<void> {
  if (!isWired(provider)) {
    throw new Error(`Provider ${provider} is not wired yet.`)
  }
  await adapters[provider].connect()
  setActive(provider)
}

export function disconnect(): void {
  const p = syncStatus()
  if (p && isWired(p)) {
    adapters[p].disconnect()
  }
  setActive(null)
  localStorage.removeItem(DIRTY_KEY)
}

export function isDirty(): boolean {
  return localStorage.getItem(DIRTY_KEY) === '1'
}

export function markDirty() {
  localStorage.setItem(DIRTY_KEY, '1')
}

export function clearDirty() {
  localStorage.removeItem(DIRTY_KEY)
}

export async function pull(): Promise<RemoteFile[]> {
  const p = syncStatus()
  if (!p || !isWired(p)) throw new Error('No provider connected.')
  return adapters[p].list()
}

export async function push(file: RemoteFile): Promise<void> {
  const p = syncStatus()
  if (!p || !isWired(p)) throw new Error('No provider connected.')
  return adapters[p].write(file)
}

// Higher-level: run a sync cycle. Pulls remote files, writes any that
// aren't local, marks local notes dirty so they get pushed next.
export async function syncNow(): Promise<{ pulled: number; pushed: number; errors: string[] }> {
  const p = syncStatus()
  if (!p) throw new Error('No provider connected.')
  const errors: string[] = []
  let pulled = 0
  let pushed = 0

  // 1. Pull
  try {
    const remote = await pull()
    const { listNotes, putNote } = await import('../vault/db')
    const local = await listNotes()
    const localByPath = new Map(local.map((n) => [safePath(n.title) + '.md', n]))
    for (const r of remote) {
      const existing = localByPath.get(r.path)
      const body = r.body
      const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? r.path.replace(/\.md$/, '')
      if (!existing) {
        await putNote({
          id: crypto.randomUUID(),
          kind: 'note',
          title,
          body,
          folderId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          remotePath: r.path,
          remoteSha: r.sha,
        })
      } else if (existing.body !== body) {
        // Last-write-wins: remote overwrites local if they differ.
        // (A real CRDT would be nicer; for v1 this matches Remotely Save.)
        await putNote({ ...existing, body, remoteSha: r.sha, updatedAt: Date.now() })
      }
      pulled++
    }
  } catch (e) {
    errors.push(`pull: ${(e as Error).message}`)
  }

  // 2. Push dirty local notes
  try {
    const { listNotes, putNote } = await import('../vault/db')
    const local = await listNotes()
    for (const n of local) {
      const path = (n.remotePath ?? safePath(n.title) + '.md')
      try {
        await push({ path, sha: n.remoteSha ?? '', body: n.body })
        // record the path/sha so next push is an update not a create
        await putNote({ ...n, remotePath: path })
        pushed++
      } catch (e) {
        errors.push(`push ${n.title}: ${(e as Error).message}`)
      }
    }
    clearDirty()
  } catch (e) {
    errors.push(`push: ${(e as Error).message}`)
  }

  return { pulled, pushed, errors }
}

function safePath(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled'
}
