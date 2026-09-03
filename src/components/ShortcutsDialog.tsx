// Keyboard cheatsheet — Ctrl/Cmd+/ shows all global shortcuts. Obsidian
// has the same dialog (Help → Keyboard shortcuts).

import { useWorkspace } from '../state/workspace'

const ROWS: { keys: string; label: string }[] = [
  { keys: 'Ctrl/Cmd + P', label: 'Open command palette' },
  { keys: 'Ctrl/Cmd + O', label: 'Open quick switcher' },
  { keys: 'Ctrl/Cmd + Shift + F', label: 'Search in files' },
  { keys: 'Ctrl/Cmd + N', label: 'Create new note' },
  { keys: 'Ctrl/Cmd + W', label: 'Close current tab' },
  { keys: 'Ctrl/Cmd + \\', label: 'Toggle sidebar' },
  { keys: 'Ctrl/Cmd + /', label: 'Show this dialog' },
  { keys: 'F8', label: 'Toggle preview / source' },
  { keys: 'Tab', label: 'Indent (in editor)' },
  { keys: 'Esc', label: 'Close any open modal' },
]

export function ShortcutsDialog() {
  const ws = useWorkspace()
  return (
    <div className="fixed inset-0 z-50 bg-headline-ink/30 flex items-start justify-center pt-24 px-4" onClick={() => ws.closeModal()}>
      <div onClick={(e) => e.stopPropagation()} className="bg-paper border border-headline-ink rounded-xl w-[520px] max-w-[92vw] overflow-hidden font-ui">
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
          <h3 className="text-subheading font-display">Keyboard shortcuts</h3>
          <button onClick={() => ws.closeModal()} className="opacity-60 hover:opacity-100">×</button>
        </div>
        <ul className="px-5 py-3 divide-y divide-hairline">
          {ROWS.map((r) => (
            <li key={r.keys} className="py-2 flex items-center justify-between gap-4">
              <span className="text-body">{r.label}</span>
              <kbd className="text-caption uppercase tracking-tight font-mono border border-hairline rounded px-2 py-0.5">
                {r.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
