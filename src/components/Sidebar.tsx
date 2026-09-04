// Sidebar — file tree with nested folders, collapse/expand, context menu.
// On mobile, rendered as a slide-in panel; the optional `onClose` prop
// shows a × button at the top.

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../state/workspace'
import {
  listNotes, listFolders, createNote, createFolder,
  removeNote, removeFolder, toggleFolderCollapsed, moveNote,
  type Note, type Folder,
} from '../vault/db'

type TreeNode =
  | { kind: 'folder'; folder: Folder; depth: number; children: TreeNode[] }
  | { kind: 'note'; note: Note; depth: number }

function buildTree(folders: Folder[], notes: Note[]): TreeNode[] {
  const byParent = new Map<string | null, TreeNode[]>()
  for (const f of folders) {
    const arr = byParent.get(f.parentId) ?? []
    arr.push({ kind: 'folder', folder: f, depth: 0, children: [] })
    byParent.set(f.parentId, arr)
  }
  for (const n of notes) {
    const arr = byParent.get(n.folderId) ?? []
    arr.push({ kind: 'note', note: n, depth: 0 })
    byParent.set(n.folderId, arr)
  }
  const attach = (nodes: TreeNode[], depth: number): TreeNode[] =>
    nodes.map((n) => {
      if (n.kind === 'folder') {
        const kids = attach(byParent.get(n.folder.id) ?? [], depth + 1)
        return { ...n, depth, children: kids }
      }
      return { ...n, depth }
    })
  return attach(byParent.get(null) ?? [], 0)
}

function flatten(nodes: TreeNode[], out: TreeNode[] = [], collapsed: Set<string> = new Set()): TreeNode[] {
  for (const n of nodes) {
    out.push(n)
    if (n.kind === 'folder' && !collapsed.has(n.folder.id)) {
      flatten(n.children, out, collapsed)
    }
  }
  return out
}

type Props = { onClose?: () => void }

export function Sidebar({ onClose }: Props = {}) {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [filter, setFilter] = useState('')
  const [menu, setMenu] = useState<{ type: 'folder' | 'note' | 'root'; id: string | null; x: number; y: number } | null>(null)

  const refresh = async () => {
    setNotes(await listNotes())
    setFolders(await listFolders())
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { refresh() }, [ws.tabs.length])

  const tree = useMemo(() => buildTree(folders, notes), [folders, notes])
  const collapsed = useMemo(() => new Set(folders.filter((f) => f.collapsed).map((f) => f.id)), [folders])
  const flat = useMemo(() => flatten(tree, [], collapsed), [tree, collapsed])

  const filtered = filter
    ? flat.filter((n) => {
        const t = n.kind === 'note' ? n.note.title : n.folder.name
        return t.toLowerCase().includes(filter.toLowerCase())
      })
    : flat

  async function handleNewNote(folderId: string | null) {
    const note = await createNote(folderId)
    ws.openTab(note.id, note.title)
    navigate(`/notes/${note.id}`)
    refresh()
  }

  async function handleNewFolder(parentId: string | null) {
    const name = window.prompt('Folder name?', 'Untitled')
    if (!name) return
    await createFolder(name, parentId)
    refresh()
  }

  async function handleDelete(id: string, kind: 'note' | 'folder') {
    if (!window.confirm(`Delete this ${kind}?`)) return
    if (kind === 'note') {
      await removeNote(id)
      ws.closeTab(id)
    } else {
      await removeFolder(id, { cascade: false })
    }
    refresh()
  }

  async function handleToggle(folderId: string) {
    await toggleFolderCollapsed(folderId)
    refresh()
  }

  function openMenu(e: React.MouseEvent, type: 'folder' | 'note' | 'root', id: string | null) {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ type, id, x: e.clientX, y: e.clientY })
  }
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  return (
    <aside className="h-full flex flex-col bg-paper">
      {/* Header — close button on mobile, action buttons on desktop */}
      <div className="px-3 py-2.5 border-b border-hairline flex items-center gap-1.5">
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden -ml-1 px-2 py-1 font-ui text-body hover:bg-hairline/40 rounded"
            aria-label="Close sidebar"
            title="Close"
          >
            ×
          </button>
        )}
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="flex-1 min-w-0 bg-transparent text-body font-ui placeholder:text-pebble outline-none px-1"
        />
        <button
          onClick={() => handleNewNote(null)}
          title="New note (Ctrl/Cmd+N)"
          aria-label="New note"
          className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100 px-1.5 py-1 hover:bg-hairline/40 rounded"
        >
          + note
        </button>
        <button
          onClick={() => handleNewFolder(null)}
          title="New folder"
          aria-label="New folder"
          className="text-caption uppercase tracking-tight font-ui opacity-60 hover:opacity-100 px-1.5 py-1 hover:bg-hairline/40 rounded"
        >
          + folder
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            {filter ? (
              <p className="text-caption font-ui opacity-60">No matches.</p>
            ) : (
              <>
                <p className="text-caption uppercase tracking-tight font-ui opacity-50 mb-3">
                  ° No notes yet
                </p>
                <button
                  onClick={() => handleNewNote(null)}
                  className="text-body font-ui border border-hairline rounded-xl px-3 py-1.5 hover:bg-hairline/40"
                >
                  + Create your first note
                </button>
              </>
            )}
          </div>
        )}
        {filtered.map((node) => {
          if (node.kind === 'folder') {
            const f = node.folder
            const isCollapsed = collapsed.has(f.id)
            return (
              <div
                key={f.id}
                className="group flex items-center gap-1 pr-2 hover:bg-hairline/40 cursor-pointer"
                style={{ paddingLeft: 8 + node.depth * 12 }}
                onClick={() => handleToggle(f.id)}
                onContextMenu={(e) => openMenu(e, 'folder', f.id)}
              >
                <span className="text-caption w-3 inline-block opacity-60">{isCollapsed ? '▸' : '▾'}</span>
                <span className="text-body font-ui truncate flex-1">{f.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNewNote(f.id) }}
                  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-caption px-1"
                  title="New note in folder"
                >
                  +
                </button>
              </div>
            )
          } else {
            const n = node.note
            const active = ws.activeId === n.id
            return (
              <div
                key={n.id}
                onClick={() => { ws.openTab(n.id, n.title); navigate(`/notes/${n.id}`) }}
                onContextMenu={(e) => openMenu(e, 'note', n.id)}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', n.id)}
                className={[
                  'group flex items-center gap-1 pr-2 cursor-pointer truncate border-l-2',
                  active
                    ? 'bg-headline-ink text-paper border-l-headline-ink'
                    : 'border-l-transparent hover:bg-hairline/40',
                ].join(' ')}
                style={{ paddingLeft: 8 + node.depth * 12 + 16 }}
                title={n.title}
              >
                <span className="text-body font-ui truncate flex-1">{n.title}</span>
                <span className={['text-caption opacity-0 group-hover:opacity-60', active ? 'text-paper' : ''].join(' ')}>
                  ×
                </span>
              </div>
            )
          }
        })}
      </div>

      <div className="border-t border-hairline px-3 py-1.5 text-caption font-ui opacity-60 flex items-center justify-between">
        <span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
        <span>{folders.length} {folders.length === 1 ? 'folder' : 'folders'}</span>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.type === 'note'
            ? [
                { label: 'Move to root', onClick: async () => { if (menu.id) { await moveNote(menu.id, null); refresh() } } },
                { label: 'Delete', danger: true, onClick: () => menu.id && handleDelete(menu.id, 'note') },
              ]
            : menu.type === 'folder'
              ? [
                  { label: 'New note inside', onClick: () => handleNewNote(menu.id) },
                  { label: 'New subfolder', onClick: () => handleNewFolder(menu.id) },
                  { label: 'Delete folder', danger: true, onClick: () => menu.id && handleDelete(menu.id, 'folder') },
                ]
              : [
                  { label: 'New note', onClick: () => handleNewNote(null) },
                  { label: 'New folder', onClick: () => handleNewFolder(null) },
                ]}
          onClose={() => setMenu(null)}
        />
      )}
    </aside>
  )
}

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: { label: string; onClick: () => void; danger?: boolean }[]; onClose: () => void }) {
  return (
    <div
      className="fixed z-50 bg-paper border border-headline-ink rounded-xl py-1 min-w-[180px] font-ui"
      style={{ left: x, top: y }}
      onClick={onClose}
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={it.onClick}
          className={[
            'block w-full text-left px-3 py-1.5 text-body hover:bg-hairline/60',
            it.danger ? 'text-headline-ink' : '',
          ].join(' ')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
