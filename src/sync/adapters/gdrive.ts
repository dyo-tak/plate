// Google Drive adapter — uses the Drive v3 REST API.
// Auth: OAuth access token with `drive.file` scope (per-app folder only).

import type { RemoteFile } from '..'

const FOLDER_KEY = 'plate.sync.gdrive.folder'

async function findOrCreateFolder(token: string, name: string): Promise<string> {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (search.ok) {
    const j = await search.json()
    if (j.files?.[0]?.id) return j.files[0].id
  }
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const cj = await create.json()
  localStorage.setItem(FOLDER_KEY, cj.id)
  return cj.id
}

export const gdriveAdapter = {
  async list(token: string): Promise<RemoteFile[]> {
    const folder = await findOrCreateFolder(token, 'Plate')
    const q = `'${folder}' in parents and mimeType='text/markdown' and trashed=false`
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,headRevisionId)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
    const j = await res.json()
    const out: RemoteFile[] = []
    for (const f of j.files ?? []) {
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!r.ok) continue
      out.push({ path: f.name, sha: f.headRevisionId ?? f.id, body: await r.text() })
    }
    return out
  },

  async write(token: string, file: RemoteFile): Promise<void> {
    const folder = await findOrCreateFolder(token, 'Plate')
    // Find existing file by name in folder, then update or create.
    const q = `name='${file.path}' and '${folder}' in parents and trashed=false`
    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const sj = await search.json()
    const existingId = sj.files?.[0]?.id

    const meta = { name: file.path, mimeType: 'text/markdown' }
    const boundary = '-------plate' + Date.now()
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(existingId ? { ...meta } : { ...meta, parents: [folder] }),
      `--${boundary}`,
      'Content-Type: text/markdown',
      '',
      file.body,
      `--${boundary}--`,
      '',
    ].join('\r\n')

    const url = existingId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
    const method = existingId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
    if (!res.ok) throw new Error(`Drive write failed: ${res.status}`)
  },
}
