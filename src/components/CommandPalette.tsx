// Command palette — fuzzy command + note search. Single input, both kinds
// of result, arrow-keys to navigate, enter to run.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from '../state/workspace'
import { useNavigate } from 'react-router-dom'
import { listNotes } from '../vault/db'

type Hit =
  | { kind: 'note'; id: string; title: string; score: number }
  | { kind: 'cmd'; id: string; label: string; hint?: string; run: () => void; score: number }

export function CommandPalette() {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [notes, setNotes] = useState<{ id: string; title: string }[]>([])
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { listNotes().then((ns) => setNotes(ns.map((n) => ({ id: n.id, title: n.title })))) }, [])
  useEffect(() => { inputRef.current?.focus() }, [])

  const commands: Array<{ kind: 'cmd'; id: string; label: string; hint?: string; run: () => void; score: number }> = useMemo(() => [
    { kind: 'cmd', id: 'palette', label: 'Open command palette', run: () => {}, score: 0 },
    { kind: 'cmd', id: 'switcher', label: 'Open quick switcher', hint: 'Ctrl/Cmd+O', run: () => ws.openModal({ kind: 'switcher' }), score: 0 },
    { kind: 'cmd', id: 'search', label: 'Search in files', hint: 'Ctrl/Cmd+Shift+F', run: () => ws.openModal({ kind: 'search' }), score: 0 },
    { kind: 'cmd', id: 'new', label: 'Create new note', hint: 'Ctrl/Cmd+N', run: async () => {
        const { createNote } = await import('../vault/db')
        const n = await createNote()
        ws.openTab(n.id, n.title)
        navigate(`/notes/${n.id}`)
      }, score: 0 },
    { kind: 'cmd', id: 'toggleSidebar', label: 'Toggle sidebar', hint: 'Ctrl/Cmd+\\', run: () => ws.toggleSidebar(), score: 0 },
    { kind: 'cmd', id: 'shortcuts', label: 'Show keyboard shortcuts', hint: 'Ctrl/Cmd+/', run: () => ws.openModal({ kind: 'shortcuts' }), score: 0 },
    { kind: 'cmd', id: 'toggleMode', label: 'Toggle preview / source', hint: 'F8', run: () => window.dispatchEvent(new CustomEvent('plate:toggle-editor-mode')), score: 0 },
  ], [ws, navigate])

  const hits: Hit[] = useMemo(() => {
    if (!q.trim()) {
      const initial: Hit[] = []
      for (const c of commands) initial.push({ ...c, score: 1 })
      for (const n of notes.slice(0, 5)) initial.push({ kind: 'note', id: n.id, title: n.title, score: 1 })
      return initial
    }
    const ql = q.toLowerCase()
    const score = (s: string) => {
      const t = s.toLowerCase()
      if (t === ql) return 100
      if (t.startsWith(ql)) return 50
      if (t.includes(ql)) return 10
      // subsequence match
      let i = 0
      for (const ch of t) if (ch === ql[i]) i++
      return i === ql.length ? 1 : 0
    }
    const result: Hit[] = []
    for (const c of commands) {
      const s = score(c.label)
      if (s > 0) result.push({ ...c, score: s })
    }
    for (const n of notes) {
      const s = score(n.title)
      if (s > 0) result.push({ kind: 'note', id: n.id, title: n.title, score: s })
    }
    return result.sort((a, b) => b.score - a.score).slice(0, 12)
  }, [q, notes, commands])

  useEffect(() => { setIdx(0) }, [q])

  function runHit(h: Hit) {
    if (h.kind === 'cmd') {
      h.run()
    } else {
      ws.openTab(h.id, h.title)
      navigate(`/notes/${h.id}`)
    }
    ws.closeModal()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const h = hits[idx]
      if (h) runHit(h)
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
          placeholder="Type a command or search notes…"
          className="w-full px-4 py-3 text-subheading bg-transparent outline-none border-b border-hairline"
        />
        <ul className="max-h-[60vh] overflow-y-auto">
          {hits.length === 0 && (
            <li className="px-4 py-3 text-caption uppercase tracking-tight opacity-60">No matches</li>
          )}
          {hits.map((h, i) => (
            <li
              key={`${h.kind}-${h.id}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => runHit(h)}
              className={[
                'px-4 py-2 flex items-center justify-between gap-4 cursor-pointer',
                i === idx ? 'bg-headline-ink text-paper' : 'hover:bg-hairline/40',
              ].join(' ')}
            >
              <span className="text-body truncate">
                {h.kind === 'cmd' ? h.label : h.title}
              </span>
              <span className={['text-caption uppercase tracking-tight', i === idx ? 'opacity-80' : 'opacity-60'].join(' ')}>
                {h.kind === 'cmd' ? (h.hint ?? 'command') : 'note'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ModalShell>
  )
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
