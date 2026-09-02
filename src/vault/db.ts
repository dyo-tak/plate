// Vault — local IndexedDB-backed store for notes.
// One row per note. Body is markdown. Title is the first H1 or first line.

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'plate-vault'
const STORE = 'notes'

export type Note = {
  id: string
  title: string
  body: string
  createdAt: number
  updatedAt: number
  // Sync metadata
  remotePath?: string
  remoteSha?: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: 'id' })
          s.createIndex('updatedAt', 'updatedAt')
        }
      },
    })
  }
  return dbPromise
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

export async function list(): Promise<Note[]> {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function get(id: string): Promise<Note | null> {
  const db = await getDB()
  return (await db.get(STORE, id)) ?? null
}

export async function put(note: Note): Promise<Note> {
  const db = await getDB()
  const next: Note = { ...note, title: deriveTitle(note.body) }
  await db.put(STORE, next)
  return next
}

export async function remove(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function createNote(seedBody = '# New note\n\n'): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: newId(),
    title: deriveTitle(seedBody),
    body: seedBody,
    createdAt: now,
    updatedAt: now,
  }
  return put(note)
}
