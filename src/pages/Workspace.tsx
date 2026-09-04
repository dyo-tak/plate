// Workspace — the main /notes page, modeled after Obsidian's three-pane
// chrome: collapsible sidebar | tabs strip | editor | status bar.
// Mobile-first: sidebar slides in from the left as an overlay, editor
// fills the viewport. Desktop: side-by-side.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Tabs } from '../components/Tabs'
import { StatusBar } from '../components/StatusBar'
import { Editor } from '../components/Editor'
import { useWorkspace } from '../state/workspace'
import { getNote, removeNote, createNote, type Note } from '../vault/db'
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts'

export function Workspace() {
  useGlobalShortcuts()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const ws = useWorkspace()
  const [note, setNote] = useState<Note | null>(null)
  const [editorMode, setEditorMode] = useState<'preview' | 'source'>('preview')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // On mobile, the sidebar is an overlay; close it when the route changes
  useEffect(() => { setMobileSidebarOpen(false) }, [id])

  // If a route has an id but it's not in the open tabs, open it
  useEffect(() => {
    if (id && !ws.tabs.some((t) => t.id === id)) {
      getNote(id).then((n) => {
        if (n) ws.openTab(n.id, n.title)
      })
    }
  }, [id])

  useEffect(() => {
    if (id) ws.setActive(id)
  }, [id])

  // Load note body
  useEffect(() => {
    if (!id) { setNote(null); return }
    getNote(id).then(setNote)
  }, [id, ws.tabs.length])

  async function handleDelete() {
    if (!note) return
    if (!window.confirm(`Delete "${note.title}"?`)) return
    await removeNote(note.id)
    ws.closeTab(note.id)
    navigate('/notes')
  }

  async function handleQuickCreate() {
    const n = await createNote()
    ws.openTab(n.id, n.title)
    navigate(`/notes/${n.id}`)
  }

  return (
    <div className="h-[calc(100vh-48px)] md:h-[calc(100vh-56px)] flex flex-col relative">
      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar — always visible when sidebarOpen */}
        {ws.sidebarOpen && (
          <div className="hidden md:block w-64 shrink-0 border-r border-hairline">
            <Sidebar />
          </div>
        )}

        {/* Thin collapsed strip — desktop only, when sidebar is closed */}
        {!ws.sidebarOpen && (
          <div
            className="hidden md:flex w-10 shrink-0 border-r border-hairline flex-col items-center pt-3 gap-4 cursor-pointer hover:bg-hairline/40"
            onClick={ws.toggleSidebar}
            title="Open sidebar (Ctrl/Cmd+\\)"
          >
            <span className="text-caption font-ui opacity-60">»</span>
            <span className="text-caption font-ui opacity-60" style={{ writingMode: 'vertical-rl' }}>files</span>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs onOpenSidebar={() => setMobileSidebarOpen(true)} />

          {note ? (
            <Editor
              key={note.id}
              note={note}
              onModeChange={setEditorMode}
              onDelete={handleDelete}
              onChange={() => { /* inline save is debounced inside Editor */ }}
            />
          ) : (
            <EmptyState onCreate={handleQuickCreate} />
          )}
        </div>
      </div>

      <StatusBar note={note} editorMode={editorMode} />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-headline-ink/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-paper border-r border-hairline shadow-none">
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-paper px-6">
      <div className="text-center max-w-sm">
        <p className="text-caption uppercase tracking-tight font-ui opacity-50 mb-4">
          ° Empty workspace
        </p>
        <h2 className="font-display text-heading-sm text-headline-ink mb-6">
          No note open
        </h2>
        <button
          onClick={onCreate}
          className="border border-headline-ink text-caption uppercase tracking-tight font-bold rounded-xl px-5 py-2.5 font-ui hover:bg-headline-ink hover:text-paper transition-colors"
        >
          + Create a new note
        </button>
        <p className="text-caption uppercase tracking-tight font-ui opacity-50 mt-6">
          ° Or press <kbd className="font-mono border border-hairline rounded px-1.5 py-0.5">Ctrl/Cmd + O</kbd> to jump to one
        </p>
      </div>
    </div>
  )
}
