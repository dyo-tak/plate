// OneDrive adapter — uses Microsoft Graph.
// Auth: OAuth access token with `Files.ReadWrite` + `offline_access`.

import type { RemoteFile } from '..'

const FOLDER_KEY = 'plate.sync.onedrive.folder'

function getFolder(): string {
  const f = localStorage.getItem(FOLDER_KEY)
  if (!f) throw new Error('No OneDrive folder set. Run a first sync to create one.')
  return f
}

async function findOrCreateFolder(token: string): Promise<string> {
  const cached = localStorage.getItem(FOLDER_KEY)
  if (cached) return cached
  // Create a "Plate" folder at the drive root.
  const res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Plate', folder: {}, '@microsoft.graph.conflictBehavior': 'replace' }),
  })
  const j = await res.json()
  localStorage.setItem(FOLDER_KEY, j.id)
  return j.id
}

export const onedriveAdapter = {
  async list(token: string): Promise<RemoteFile[]> {
    const folder = await findOrCreateFolder(token)
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${folder}/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`OneDrive list failed: ${res.status}`)
    const j = await res.json()
    const out: RemoteFile[] = []
    for (const item of j.value ?? []) {
      if (item.file && item.name.endsWith('.md')) {
        const r = await fetch(item['@microsoft.graph.downloadUrl'], {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok) continue
        out.push({ path: item.name, sha: item.eTag ?? item.id, body: await r.text() })
      }
    }
    return out
  },

  async write(token: string, file: RemoteFile): Promise<void> {
    const folder = await findOrCreateFolder(token)
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folder}:/${encodeURIComponent(file.path)}:/content`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/markdown' },
      body: file.body,
    })
    if (!res.ok) throw new Error(`OneDrive write failed: ${res.status}`)
    void getFolder() // touch for the linter / future use
  },
}
