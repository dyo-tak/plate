// Status bar — Obsidian-style footer with word count, current note path,
// sync indicator, and a hint strip. Lives at the bottom of the workspace.

import { useEffect, useState } from 'react'
import { useWorkspace } from '../state/workspace'
import type { Note } from '../vault/db'
// useWorkspace is used inside SyncIndicator below
void useWorkspace

type Props = {
  note: Note | null
  editorMode: 'preview' | 'source'
}

export function StatusBar({ note, editorMode }: Props) {
  const [folderPath, setFolderPath] = useState<string>('/')

  useEffect(() => {
    if (!note) return
    setFolderPath(folderIdToPath(note.folderId))
  }, [note?.id, note?.folderId])

  const wordCount = note ? countWords(note.body) : 0
  const charCount = note ? note.body.length : 0

  return (
    <footer className="h-7 border-t border-hairline px-3 flex items-center justify-between text-caption font-ui bg-paper">
      <div className="flex items-center gap-4">
        <span className="opacity-60">{folderPath}</span>
        <span className="opacity-60">·</span>
        <span>{editorMode === 'preview' ? 'Live preview' : 'Source'}</span>
      </div>
      <div className="flex items-center gap-4">
        <SyncIndicator />
        <span>{wordCount} words · {charCount} chars</span>
      </div>
    </footer>
  )
}

function SyncIndicator() {
  const ws = useWorkspace()
  const last = ws.lastSync ? new Date(ws.lastSync).toLocaleTimeString() : '—'
  const color = ws.syncStatus === 'syncing' ? 'animate-pulse' : ws.syncStatus === 'error' ? 'text-headline-ink underline' : 'opacity-60'
  return (
    <span className={color} title={`Sync: ${ws.syncStatus} · last: ${last}`}>
      ° {ws.syncStatus === 'syncing' ? 'syncing…' : ws.lastSync ? `synced ${last}` : 'local only'}
    </span>
  )
}

function folderIdToPath(_id: string | null): string {
  // Quick path resolution — keep simple. We don't currently render the full
  // folder breadcrumb, just root marker.
  return '/'
}

function countWords(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length
}
