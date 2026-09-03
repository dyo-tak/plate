import { useEffect, useState, useCallback } from 'react'
import { listNotes, getNote, putNote, removeNote, createNote, type Note } from '../vault/db'
void getNote

// React-friendly hook over the IndexedDB vault. Re-reads when the DB changes
// (create / put / remove) so the file tree stays in sync.
export function useVault() {
  const [notes, setNotes] = useState<Note[]>([])
  const [lastSync, setLastSync] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setNotes(await listNotes())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(async (seed?: string) => {
    const n = await createNote(null, seed)
    await refresh()
    return n
  }, [refresh])

  const update = useCallback(async (n: Note) => {
    const next = await putNote(n)
    await refresh()
    return next
  }, [refresh])

  const removeOne = useCallback(async (id: string) => {
    await removeNote(id)
    await refresh()
  }, [refresh])

  const read = useCallback(async (id: string) => {
    return getNote(id)
  }, [])

  return { notes, lastSync, create, update, remove: removeOne, get: read, refresh, setLastSync }
}
