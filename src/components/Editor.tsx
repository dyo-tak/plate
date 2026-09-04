// CodeMirror 6 editor with live preview.
// - Default mode: live preview (markdown decorations render, syntax hidden)
// - F8 or toolbar button: toggle to source-only
// - All changes auto-save to the vault via `onChange`
// Mode changes re-mount the view (CM6 can't add/remove plugins at runtime).

import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection,
  placeholder as cmPlaceholder,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput,
} from '@codemirror/language'
import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
} from '@codemirror/autocomplete'
import { livePreviewPlugin, livePreviewTheme } from './livePreview'
import { putNote, type Note } from '../vault/db'

type Props = {
  note: Note
  onChange: (body: string) => void
  onModeChange?: (mode: Mode) => void
  onDelete: () => void
}

type Mode = 'preview' | 'source'

const baseExtensions = (mode: Mode) => [
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
  ...(mode === 'preview' ? [livePreviewPlugin, livePreviewTheme] : []),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  cmPlaceholder('Start writing…'),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...completionKeymap,
    indentWithTab,
    { key: 'F8', preventDefault: true, run: () => { window.dispatchEvent(new CustomEvent('plate:toggle-editor-mode')); return true } },
  ]),
  EditorView.theme(
    {
      '&': {
        backgroundColor: 'transparent',
        color: 'var(--color-headline-ink)',
        fontSize: '16px',
        fontFamily: 'var(--font-louize)',
        height: '100%',
      },
      '.cm-content': { padding: '24px 8px', maxWidth: '780px', margin: '0 auto' },
      '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--color-midstone)', border: 'none' },
      '.cm-activeLine': { backgroundColor: 'transparent' },
      '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-sepia)' },
      '.cm-cursor': { borderLeft: '2px solid var(--color-headline-ink)' },
      '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--color-headline-ink)' },
      '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--color-sepia)' },
    },
    { dark: false }
  ),
]

export function Editor({ note, onChange, onModeChange, onDelete }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [mode, setMode] = useState<Mode>('preview')
  const [doc, setDoc] = useState<string>(note.body)

  // Mount the view. Re-mounts when note.id or mode changes.
  useEffect(() => {
    if (!hostRef.current) return
    const state = EditorState.create({
      doc,
      extensions: [
        ...baseExtensions(mode),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const body = u.state.doc.toString()
            setDoc(body)
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
  }, [note.id, mode])

  // Listen for global F8 events (from useGlobalShortcuts)
  useEffect(() => {
    const handler = () => setMode((m) => { const n = m === 'preview' ? 'source' : 'preview'; onModeChange?.(n); return n })
    window.addEventListener('plate:toggle-editor-mode', handler)
    return () => window.removeEventListener('plate:toggle-editor-mode', handler)
  }, [onModeChange])

  // Save helper exposed via onChange (debounced inside the vault hook upstream)
  // (We do inline save here too for resilience)
  useEffect(() => {
    if (doc === note.body) return
    const t = setTimeout(() => {
      void putNote({ ...note, body: doc, updatedAt: Date.now() })
    }, 400)
    return () => clearTimeout(t)
  }, [doc, note])

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 md:px-6 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-hairline">
        <div className="min-w-0 flex-1">
          <p className="text-caption uppercase tracking-tight font-ui opacity-60 truncate">
            ° {note.title}
          </p>
          <p className="text-caption font-ui opacity-50 truncate">
            {new Date(note.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMode((m) => { const n = m === 'preview' ? 'source' : 'preview'; onModeChange?.(n); return n })}
            className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100 px-2 py-1"
            title="Toggle preview/source (F8)"
          >
            {mode === 'preview' ? 'Preview' : 'Source'}
          </button>
          <button
            onClick={onDelete}
            className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100 px-2 py-1"
            title="Delete note"
          >
            Delete
          </button>
        </div>
      </div>
      <div ref={hostRef} className="flex-1 overflow-auto font-serif min-h-0" />
    </div>
  )
}
