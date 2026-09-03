// Workspace state — open tabs, active note, sidebar visibility, modals.
// Backed by React context. Persisted to localStorage so reloads keep tabs
// open (Obsidian does this too).

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'

export type Tab = {
  id: string          // note id
  title: string
  pinned?: boolean
}

export type Modal =
  | { kind: 'palette' }
  | { kind: 'switcher' }
  | { kind: 'search' }
  | { kind: 'shortcuts' }
  | { kind: 'settings' }
  | null

type WorkspaceState = {
  // Tabs
  tabs: Tab[]
  activeId: string | null
  openTab: (noteId: string, title: string) => void
  closeTab: (noteId: string) => void
  setActive: (noteId: string) => void
  closeOtherTabs: (noteId: string) => void

  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void

  // Modal
  modal: Modal
  openModal: (m: Modal) => void
  closeModal: () => void

  // Last sync timestamp (shown in status bar)
  lastSync: number | null
  setLastSync: (t: number) => void

  // Sync status label
  syncStatus: 'idle' | 'syncing' | 'offline' | 'error'
  setSyncStatus: (s: WorkspaceState['syncStatus']) => void
}

const Ctx = createContext<WorkspaceState | null>(null)

const STORAGE_KEY = 'plate.workspace.v1'

type Persisted = {
  tabs: Tab[]
  activeId: string | null
  sidebarOpen: boolean
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { tabs: [], activeId: null, sidebarOpen: true }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(loadPersisted, [])
  const [tabs, setTabs] = useState<Tab[]>(persisted.tabs)
  const [activeId, setActiveId] = useState<string | null>(persisted.activeId)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(persisted.sidebarOpen)
  const [modal, setModal] = useState<Modal>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [syncStatus, setSyncStatus] = useState<WorkspaceState['syncStatus']>('idle')

  // Persist on change
  useEffect(() => {
    const p: Persisted = { tabs, activeId, sidebarOpen }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  }, [tabs, activeId, sidebarOpen])

  const openTab = useCallback((id: string, title: string) => {
    setTabs((cur) => {
      if (cur.some((t) => t.id === id)) return cur
      return [...cur, { id, title }]
    })
    setActiveId(id)
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs((cur) => {
      const next = cur.filter((t) => t.id !== id)
      return next
    })
    setActiveId((cur) => {
      if (cur !== id) return cur
      // fall back to the most-recent remaining tab
      const remaining = tabs.filter((t) => t.id !== id)
      return remaining.length ? remaining[remaining.length - 1].id : null
    })
  }, [tabs])

  const setActive = useCallback((id: string) => setActiveId(id), [])

  const closeOtherTabs = useCallback((id: string) => {
    setTabs((cur) => cur.filter((t) => t.id === id || t.pinned))
    setActiveId(id)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])

  const openModal = useCallback((m: Modal) => setModal(m), [])
  const closeModal = useCallback(() => setModal(null), [])

  const value: WorkspaceState = {
    tabs, activeId,
    openTab, closeTab, setActive, closeOtherTabs,
    sidebarOpen, toggleSidebar, setSidebarOpen,
    modal, openModal, closeModal,
    lastSync, setLastSync,
    syncStatus, setSyncStatus,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkspace(): WorkspaceState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return v
}
