// Quick switcher — Ctrl/Cmd+O. Like the palette but notes-only, with a
// bigger preview of the matching line from the body.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../state/workspace'
import { useNavigate } from 'react-router-dom'
import { listNotes, type Note } from '../vault/db'

export function QuickSwitcher() {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const [notes, setNotes] = useState<Note[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { listNotes().then(setNotes) }, [])
  useEffect(() => { inputRef.current?.focus() }, [])

  type Hit = { n: Note; bm: number }
  const hits: Hit[] = useMemo(() => {
    if (!q.trim()) return notes.slice(0, 10).map((n) => ({ n, bm: -1 }))
    const ql = q.toLowerCase()
    const out: Hit[] = []
    for (const n of notes) {
      const t = n.title.toLowerCase()
      let s = 0
      if (t.startsWith(ql)) s += 50
      if (t.includes(ql)) s += 20
      const bm = n.body.toLowerCase().indexOf(ql)
      if (bm !== -1) s += 5
      if (s > 0) out.push({ n, bm })
    }
    return out
      .sort((a, b) => {
        const at = a.n.title.toLowerCase().startsWith(ql) ? 1 : 0
        const bt = b.n.title.toLowerCase().startsWith(ql) ? 1 : 0
        return bt - at
      })
      .slice(0, 12)
  }, [q, notes])

  useEffect(() => { setIdx(0) }, [q])

  function pick(n: Note) {
    ws.openTab(n.id, n.title)
    navigate(`/notes/${n.id}`)
    ws.closeModal()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const h = hits[idx]
      if (h) pick(h.n)
    } else if (e.key === 'Escape') {
      ws.closeModal()
    }
  }

  return (
    <ModalShell onClose={() => ws.closeModal()}>
      <div className="bg-paper border border-headline-ink rounded-xl w-[640px] max-w-[92vw] overflow-hidden font-ui">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to note…"
          className="w-full px-4 py-3 text-subheading bg-transparent outline-none border-b border-hairline"
        />
        <ul className="max-h-[60vh] overflow-y-auto">
          {hits.length === 0 && (
            <li className="px-4 py-3 text-caption uppercase tracking-tight opacity-60">No matches</li>
          )}
          {hits.map((h, i) => (
            <li
              key={h.n.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => pick(h.n)}
              className={[
                'px-4 py-2 cursor-pointer',
                i === idx ? 'bg-headline-ink text-paper' : 'hover:bg-hairline/40',
              ].join(' ')}
            >
              <div className="text-body truncate">{h.n.title}</div>
              {h.bm !== undefined && h.bm !== -1 && (
                <div className={['text-caption truncate mt-0.5', i === idx ? 'opacity-80' : 'opacity-60'].join(' ')}>
                  {snippet(h.n.body, h.bm, q.length)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  )
}

function snippet(s: string, at: number, len: number): string {
  const start = Math.max(0, at - 30)
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
