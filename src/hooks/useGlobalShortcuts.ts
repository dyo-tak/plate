// Global keyboard shortcuts — wired once at the app root, dispatching to
// the workspace. Obsidian parity:
//   Ctrl/Cmd + P         — command palette
//   Ctrl/Cmd + O         — quick switcher
//   Ctrl/Cmd + Shift + F — full-text search
//   Ctrl/Cmd + \         — toggle sidebar
//   Ctrl/Cmd + N         — new note
//   Ctrl/Cmd + W         — close current tab
//   Ctrl/Cmd + S         — save (auto-save is on, so this is a no-op now)
//   Ctrl/Cmd + /         — keyboard cheatsheet
//   F8                    — toggle editor preview / source

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../state/workspace'
import { createNote } from '../vault/db'

export function useGlobalShortcuts() {
  const ws = useWorkspace()
  const navigate = useNavigate()

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }

    async function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      // F8 — toggle editor mode (handled inside Editor.tsx; we expose a
      // window-level custom event so it doesn't depend on a ref)
      if (e.key === 'F8') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('plate:toggle-editor-mode'))
        return
      }

      if (!mod) return

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault()
          ws.openModal({ kind: 'palette' })
          break
        case 'o':
          e.preventDefault()
          ws.openModal({ kind: 'switcher' })
          break
        case 'f':
          if (e.shiftKey) {
            e.preventDefault()
            ws.openModal({ kind: 'search' })
          }
          break
        case '\\':
          e.preventDefault()
          ws.toggleSidebar()
          break
        case 'n':
          if (!isTypingTarget(e.target)) {
            e.preventDefault()
            const note = await createNote()
            ws.openTab(note.id, note.title)
            navigate(`/notes/${note.id}`)
          }
          break
        case 'w':
          if (ws.activeId) {
            e.preventDefault()
            ws.closeTab(ws.activeId)
            if (ws.activeId) navigate('/notes')
          }
          break
        case '/':
          e.preventDefault()
          ws.openModal({ kind: 'shortcuts' })
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ws, navigate])
}
