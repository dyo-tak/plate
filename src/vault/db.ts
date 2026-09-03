// Vault — local IndexedDB-backed store for notes and folders.
// One row per entry (note or folder), discriminated by `kind`.
// `init()` runs once on first read to upgrade schemas idempotently.

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'plate-vault'
const VERSION = 2
const STORE = 'entries'

export type Note = {
  id: string
  kind: 'note'
  title: string
  body: string
  folderId: string | null
  createdAt: number
  updatedAt: number
  // Sync metadata
  remotePath?: string
  remoteSha?: string
}

export type Folder = {
  id: string
  kind: 'folder'
  name: string
  parentId: string | null
  collapsed: boolean
  createdAt: number
}

export type Entry = Note | Folder

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const s = db.createObjectStore(STORE, { keyPath: 'id' })
          s.createIndex('updatedAt', 'updatedAt')
          s.createIndex('kind', 'kind')
        }
        if (oldVersion < 2) {
          // v1 → v2: add a folderId index. The actual index is created
          // lazily by init() on first read so we don't have to fight
          // idb's typings for createIndex inside the upgrade callback.
        }
      },
    })
  }
  return dbPromise
}

async function init() {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const s = tx.objectStore(STORE)
  if (s && !s.indexNames.contains('folderId')) {
    try { (s as unknown as { createIndex: (n: string, k: string) => unknown }).createIndex('folderId', 'folderId') } catch {}
  }
  await tx.done
  return db
}

function deriveTitle(body: string): string {
  const m = body.match(/^#\s+(.+)$/m)
  if (m) return m[1].trim()
  const firstLine = body.split('\n').find((l) => l.trim().length > 0) ?? ''
  return firstLine.slice(0, 80) || 'Untitled'
}

function newId(): string {
  return crypto.randomUUID()
}

// -- Notes --

export async function listNotes(): Promise<Note[]> {
  await init()
  const db = await getDB()
  const all = (await db.getAll(STORE)) as Entry[]
  return all
    .filter((e): e is Note => e.kind === 'note')
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDB()
  const e = (await db.get(STORE, id)) as Entry | undefined
  return e?.kind === 'note' ? e : null
}

export async function putNote(note: Note): Promise<Note> {
  const db = await getDB()
  const next: Note = { ...note, title: deriveTitle(note.body), updatedAt: Date.now() }
  await db.put(STORE, next)
  return next
}

export async function removeNote(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function createNote(folderId: string | null = null, seedBody = '# New note\n\n'): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: newId(),
    kind: 'note',
    title: deriveTitle(seedBody),
    body: seedBody,
    folderId,
    createdAt: now,
    updatedAt: now,
  }
  return putNote(note)
}

// -- Folders --

export async function listFolders(): Promise<Folder[]> {
  await init()
  const db = await getDB()
  const all = (await db.getAll(STORE)) as Entry[]
  return all
    .filter((e): e is Folder => e.kind === 'folder')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createFolder(name: string, parentId: string | null = null): Promise<Folder> {
  const db = await getDB()
  const folder: Folder = {
    id: newId(),
    kind: 'folder',
    name,
    parentId,
    collapsed: false,
    createdAt: Date.now(),
  }
  await db.put(STORE, folder)
  return folder
}

export async function removeFolder(id: string, opts: { cascade: boolean } = { cascade: false }): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const all = (await tx.store.getAll()) as Entry[]
  for (const e of all) {
    if (e.kind === 'folder' && e.parentId === id) {
      await tx.store.put({ ...e, parentId: null })
    } else if (e.kind === 'note' && e.folderId === id) {
      if (opts.cascade) {
        await tx.store.delete(e.id)
      } else {
        await tx.store.put({ ...e, folderId: null })
      }
    }
  }
  await tx.store.delete(id)
  await tx.done
}

export async function toggleFolderCollapsed(id: string): Promise<Folder | null> {
  const db = await getDB()
  const e = (await db.get(STORE, id)) as Entry | undefined
  if (!e || e.kind !== 'folder') return null
  const next: Folder = { ...e, collapsed: !e.collapsed }
  await db.put(STORE, next)
  return next
}

export async function moveNote(noteId: string, folderId: string | null): Promise<Note | null> {
  const db = await getDB()
  const e = (await db.get(STORE, noteId)) as Entry | undefined
  if (!e || e.kind !== 'note') return null
  const next: Note = { ...e, folderId }
  await db.put(STORE, next)
  return next
}

// -- Stats --

export async function getStats(): Promise<{ notes: number; folders: number; words: number }> {
  const db = await getDB()
  const all = (await db.getAll(STORE)) as Entry[]
  const notes = all.filter((e): e is Note => e.kind === 'note')
  const folders = all.filter((e): e is Folder => e.kind === 'folder')
  const words = notes.reduce((acc, n) => acc + countWords(n.body), 0)
  return { notes: notes.length, folders: folders.length, words }
}

function countWords(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length
}

// -- Backwards-compat shims (old code may still import these names) --

export { listNotes as list, getNote as get }
export { putNote as put, removeNote as remove }
