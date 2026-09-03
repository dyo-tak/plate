// Full-text search — Ctrl/Cmd+Shift+F. Searches note titles + bodies,
// shows context around each match, click to open.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../state/workspace'
import { useNavigate } from 'react-router-dom'
import { listNotes, type Note } from '../vault/db'

type Match = { note: Note; at: number; line: number }

export function SearchPanel() {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { listNotes().then(setNotes) }, [])
  useEffect(() => { inputRef.current?.focus() }, [])

  const matches: Match[] = useMemo(() => {
    if (!q.trim()) return []
    const ql = q.toLowerCase()
    const out: Match[] = []
    for (const n of notes) {
      const hay = n.title + '\n' + n.body
      let i = hay.toLowerCase().indexOf(ql)
      while (i !== -1) {
        const before = hay.slice(0, i)
        const line = before.split('\n').length
        out.push({ note: n, at: i, line })
        i = hay.toLowerCase().indexOf(ql, i + ql.length)
        if (out.length > 200) break
      }
      if (out.length > 200) break
    }
    return out
  }, [q, notes])

  function open(n: Note) {
    ws.openTab(n.id, n.title)
    navigate(`/notes/${n.id}`)
    ws.closeModal()
  }

  return (
    <ModalShell onClose={() => ws.closeModal()}>
      <div className="bg-paper border border-headline-ink rounded-xl w-[760px] max-w-[95vw] max-h-[80vh] overflow-hidden flex flex-col font-ui">
        <div className="px-4 py-3 border-b border-hairline">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search in all notes…"
            className="w-full text-subheading bg-transparent outline-none"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {!q && (
            <p className="px-4 py-8 text-caption uppercase tracking-tight opacity-60 text-center">
              Start typing to search
            </p>
          )}
          {q && matches.length === 0 && (
            <p className="px-4 py-8 text-caption uppercase tracking-tight opacity-60 text-center">
              No matches
            </p>
          )}
          <ul>
            {matches.map((m, i) => (
              <li
                key={`${m.note.id}-${i}`}
                onClick={() => open(m.note)}
                className="px-4 py-2 border-b border-hairline hover:bg-hairline/40 cursor-pointer"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-body font-display">{m.note.title}</span>
                  <span className="text-caption uppercase tracking-tight opacity-60">line {m.line}</span>
                </div>
                <div className="text-caption font-mono opacity-80 mt-1 truncate">
                  {snippet(m.note.title + '\n' + m.note.body, m.at, q.length)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModalShell>
  )
}

function snippet(s: string, at: number, len: number): string {
  const start = Math.max(0, at - 40)
  const end = Math.min(s.length, at + len + 60)
  return (start > 0 ? '…' : '') + s.slice(start, end).replace(/\n+/g, ' ') + (end < s.length ? '…' : '')
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-headline-ink/30 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
