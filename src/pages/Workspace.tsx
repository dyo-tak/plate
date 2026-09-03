// Workspace — the main /notes page, modeled after Obsidian's three-pane
// chrome: collapsible sidebar | tabs strip | editor | status bar.
// Loads the active note from IndexedDB and mounts the editor.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { Tabs } from '../components/Tabs'
import { StatusBar } from '../components/StatusBar'
import { Editor } from '../components/Editor'
import { useWorkspace } from '../state/workspace'
import { getNote, removeNote, type Note } from '../vault/db'
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts'

export function Workspace() {
  useGlobalShortcuts()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const ws = useWorkspace()
  const [note, setNote] = useState<Note | null>(null)
  const [editorMode, setEditorMode] = useState<'preview' | 'source'>('preview')

  // If a route has an id but it's not in the open tabs, open it
  useEffect(() => {
    if (id && !ws.tabs.some((t) => t.id === id)) {
      getNote(id).then((n) => {
        if (n) ws.openTab(n.id, n.title)
      })
    }
  }, [id])

  // Sync workspace activeId with the URL
  useEffect(() => {
    if (id) ws.setActive(id)
  }, [id])

  // Load note body
  useEffect(() => {
    if (!id) { setNote(null); return }
    getNote(id).then(setNote)
    // Also refresh whenever the tab count changes (a sibling wrote)
  }, [id, ws.tabs.length])

  async function handleDelete() {
    if (!note) return
    if (!window.confirm(`Delete "${note.title}"?`)) return
    await removeNote(note.id)
    ws.closeTab(note.id)
    navigate('/notes')
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <div className="flex-1 flex min-h-0">
        {ws.sidebarOpen && (
          <div className="w-64 shrink-0">
            <Sidebar />
          </div>
        )}

        {/* Thin collapsed strip — visible when sidebar is closed */}
        {!ws.sidebarOpen && (
          <div
            className="w-10 shrink-0 border-r border-hairline flex flex-col items-center pt-3 gap-4 cursor-pointer hover:bg-hairline/40"
            onClick={ws.toggleSidebar}
            title="Open sidebar (Ctrl/Cmd+\\)"
          >
            <span className="text-caption font-ui opacity-60">»</span>
            <span className="text-caption font-ui opacity-60" style={{ writingMode: 'vertical-rl' }}>files</span>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <Tabs />

          {note ? (
            <Editor
              key={note.id}
              note={note}
              onModeChange={setEditorMode}
              onDelete={handleDelete}
              onChange={() => { /* inline save is debounced inside Editor */ }}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <StatusBar note={note} editorMode={editorMode} />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-paper">
      <div className="text-center max-w-md px-6">
        <h2 className="font-display text-heading text-headline-ink mb-3">No note open</h2>
        <p className="text-body font-display opacity-60 mb-6">
          Press <kbd className="font-mono text-caption border border-hairline rounded px-2 py-0.5">Ctrl/Cmd + N</kbd> to create a new note,
          or <kbd className="font-mono text-caption border border-hairline rounded px-2 py-0.5">Ctrl/Cmd + O</kbd> to jump to an existing one.
        </p>
        <div className="flex items-center justify-center gap-3 text-caption uppercase tracking-tight font-ui opacity-60">
          <span>° No data leaves this device</span>
        </div>
      </div>
    </div>
  )
}
