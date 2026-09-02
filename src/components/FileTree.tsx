import type { Note } from '../vault/db'

type Props = {
  notes: Note[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function FileTree({ notes, activeId, onSelect, onDelete }: Props) {
  return (
    <aside className="border border-hairline rounded-xl p-4">
      <p className="text-caption uppercase tracking-tight font-ui opacity-60 mb-3">
        ° {notes.length} {notes.length === 1 ? 'note' : 'notes'}
      </p>
      {notes.length === 0 && (
        <p className="text-caption font-ui opacity-60">No notes yet.</p>
      )}
      <ul className="space-y-1">
        {notes.map((n) => (
          <li key={n.id} className="group flex items-center justify-between gap-2">
            <button
              onClick={() => onSelect(n.id)}
              className={[
                'flex-1 text-left text-body font-display truncate',
                n.id === activeId ? 'text-headline-ink' : 'opacity-70 hover:opacity-100',
              ].join(' ')}
            >
              {n.title}
            </button>
            <button
              onClick={() => onDelete(n.id)}
              className="text-caption uppercase tracking-tight font-ui opacity-0 group-hover:opacity-60 hover:!opacity-100"
              aria-label={`Delete ${n.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
