// Tabs strip — open notes show as tabs across the top of the content area.
// Click to switch, × to close, middle-click to close. On mobile, a
// hamburger button on the left opens the sidebar overlay.

import { useWorkspace } from '../state/workspace'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getNote } from '../vault/db'

type Props = { onOpenSidebar: () => void }

export function Tabs({ onOpenSidebar }: Props) {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [titles, setTitles] = useState<Record<string, string>>({})

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

  return (
    <div className="h-10 border-b border-hairline flex items-stretch bg-paper">
      {/* Hamburger — mobile only */}
      <button
        onClick={onOpenSidebar}
        className="md:hidden px-3 border-r border-hairline font-ui text-body hover:bg-hairline/40"
        title="Files (Ctrl/Cmd+\\)"
        aria-label="Open file sidebar"
      >
        ☰
      </button>

      {ws.tabs.length === 0 ? (
        <div className="flex-1 flex items-center px-4 text-caption uppercase tracking-tight font-ui opacity-50">
          ° No tabs open
        </div>
      ) : (
        <div className="flex-1 flex items-end overflow-x-auto">
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
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); ws.closeTab(t.id) }}
                  className="opacity-50 hover:opacity-100 text-caption px-1"
                  title="Close tab"
                  aria-label="Close tab"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
