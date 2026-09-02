import { useEffect, useState, useCallback } from 'react'
import { list, get, put, remove, createNote, type Note } from '../vault/db'

// React-friendly hook over the IndexedDB vault. Re-reads when the DB changes
// (create / put / remove) so the file tree stays in sync.
export function useVault() {
  const [notes, setNotes] = useState<Note[]>([])
  const [lastSync, setLastSync] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    setNotes(await list())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(async (seed?: string) => {
    const n = await createNote(seed)
    await refresh()
    return n
  }, [refresh])

  const update = useCallback(async (n: Note) => {
    const next = await put(n)
    await refresh()
    return next
  }, [refresh])

  const removeOne = useCallback(async (id: string) => {
    await remove(id)
    await refresh()
  }, [refresh])

  const read = useCallback(async (id: string) => {
    return get(id)
  }, [])

  return { notes, lastSync, create, update, remove: removeOne, get: read, refresh, setLastSync }
}
