// Tabs strip — open notes show as tabs across the top of the content area.
// Click to switch, × to close, middle-click to close.

import { useWorkspace } from '../state/workspace'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getNote, type Note } from '../vault/db'

export function Tabs() {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [titles, setTitles] = useState<Record<string, string>>({})

  // Refresh titles whenever a tab's underlying note updates
  useEffect(() => {
    let cancelled = false
    async function refresh() {
      const next: Record<string, string> = {}
      for (const t of ws.tabs) {
        const n = await getNote(t.id)
        if (cancelled) return
        if (n) next[t.id] = n.title
      }
      setTitles(next)
    }
    refresh()
    const interval = setInterval(refresh, 2000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [ws.tabs])

  if (ws.tabs.length === 0) return null

  return (
    <div className="h-9 border-b border-hairline flex items-end overflow-x-auto bg-paper">
      {ws.tabs.map((t) => {
        const isActive = t.id === ws.activeId
        const title = titles[t.id] ?? t.title
        return (
          <div
            key={t.id}
            onClick={() => { ws.setActive(t.id); navigate(`/notes/${t.id}`) }}
            onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); ws.closeTab(t.id) } }}
            className={[
              'group h-full flex items-center gap-2 px-3 border-r border-hairline cursor-pointer font-ui text-body whitespace-nowrap',
              isActive ? 'bg-paper border-b-2 border-b-headline-ink' : 'opacity-70 hover:opacity-100',
            ].join(' ')}
          >
            <span className="truncate max-w-[180px]">{title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); ws.closeTab(t.id) }}
              className="opacity-50 hover:opacity-100"
              title="Close tab"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Keep the unused-import warning quiet
void ({} as Note)
