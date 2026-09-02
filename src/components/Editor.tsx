import { put } from '../vault/db'
import type { Note } from '../vault/db'

type Props = {
  note: Note
  onChange: (body: string) => void
  onDelete: () => void
}

// CodeMirror 6 editor — markdown, obsidian-like keybindings.
// We import the extensions lazily so the bundle stays clean.
import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'

export function Editor({ note, onChange, onDelete }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Hold the latest onChange/noteId in a ref so the EditorView transaction
  // listener always calls the freshest callback without re-creating the view.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current) return

    const state = EditorState.create({
      doc: note.body,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        indentOnInput(),
        closeBrackets(),
        autocompletion(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.theme(
          {
            '&': {
              backgroundColor: 'transparent',
              color: 'var(--color-headline-ink)',
              fontSize: '16px',
              fontFamily: 'var(--font-louize)',
            },
            '.cm-content': { padding: '16px 0' },
            '.cm-gutters': {
              backgroundColor: 'transparent',
              color: 'var(--color-midstone)',
              border: 'none',
            },
            '.cm-activeLine': { backgroundColor: 'transparent' },
            '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-sepia)' },
            '.cm-cursor': { borderLeft: '2px solid var(--color-headline-ink)' },
            '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-headline-ink)' },
            '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--color-sepia)' },
          },
          { dark: false }
        ),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const body = u.state.doc.toString()
            onChangeRef.current(body)
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [note.id])

  // External title display: derive from the first H1 or first non-empty line.
  const title = note.title

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-caption uppercase tracking-tight font-ui opacity-60">
            ° Updated {new Date(note.updatedAt).toLocaleString()}
          </p>
          <h2 className="font-display text-heading-sm text-headline-ink mt-1">{title}</h2>
        </div>
        <button
          onClick={onDelete}
          className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100"
        >
          Delete
        </button>
      </div>
      <div
        ref={hostRef}
        className="border border-hairline rounded-xl p-4 md:p-6 min-h-[60vh] font-serif"
      />
    </div>
  )
}

// keep the unused import warning quiet for `put` in case we re-add
// explicit save buttons later.
void put
