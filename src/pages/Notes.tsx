import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FileTree } from '../components/FileTree'
import { Editor } from '../components/Editor'
import { useVault } from '../hooks/useVault'
import type { Note } from '../vault/types'

export function Notes() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { notes, create, remove, get } = useVault()
  const [current, setCurrent] = useState<Note | null>(null)

  useEffect(() => {
    if (!id) return
    get(id).then(setCurrent)
  }, [id, get])

  async function handleCreate() {
    const note = await create()
    navigate(`/notes/${note.id}`)
  }

  return (
    <main className="px-6 md:px-10 py-8 section-paper min-h-[70vh]">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-heading text-headline-ink">Notes</h1>
        <button
          onClick={handleCreate}
          className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-4 py-2 font-ui hover:bg-headline-ink hover:text-paper transition-colors"
        >
          + New note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        <FileTree
          notes={notes}
          activeId={id ?? null}
          onSelect={(noteId) => navigate(`/notes/${noteId}`)}
          onDelete={async (noteId) => {
            await remove(noteId)
            if (noteId === id) navigate('/notes')
          }}
        />

        <div className="min-h-[60vh]">
          {current ? (
            <Editor
              key={current.id}
              note={current}
              onChange={async (body) => {
                await get(current.id).then((n) => n && saveInline(n, body))
              }}
              onDelete={async () => {
                await remove(current.id)
                navigate('/notes')
              }}
            />
          ) : (
            <div className="border border-hairline rounded-xl p-8 text-center opacity-60 font-ui">
              <p className="text-subheading font-display mb-2">No note selected</p>
              <p className="text-caption uppercase tracking-tight">
                Pick one from the list, or write a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

async function saveInline(n: Note, body: string) {
  // direct write-through — keeps the editor responsive without bouncing through React state
  const { put } = await import('../vault/db')
  await put({ ...n, body, updatedAt: Date.now() })
}
