import { Routes, Route, Navigate } from 'react-router-dom'
import { Nav } from './components/Nav'
import { WorkspaceProvider } from './state/workspace'
import { Workspace } from './pages/Workspace'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import SyncCallback from './pages/SyncCallback'
import { CommandPalette } from './components/CommandPalette'
import { QuickSwitcher } from './components/QuickSwitcher'
import { SearchPanel } from './components/SearchPanel'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { useWorkspace } from './state/workspace'

function ModalHost() {
  const ws = useWorkspace()
  if (!ws.modal) return null
  switch (ws.modal.kind) {
    case 'palette':   return <CommandPalette />
    case 'switcher':  return <QuickSwitcher />
    case 'search':    return <SearchPanel />
    case 'shortcuts': return <ShortcutsDialog />
    case 'settings':  return null // settings has its own route; modal is unused
  }
}

export default function App() {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-paper text-headline-ink font-ui flex flex-col">
        <Nav />

        <Routes>
          <Route path="/" element={<Navigate to="/notes" replace />} />
          <Route path="/notes" element={<Workspace />} />
          <Route path="/notes/:id" element={<Workspace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/sync/callback" element={<SyncCallback />} />
        </Routes>

        <ModalHost />
      </div>
    </WorkspaceProvider>
  )
}
