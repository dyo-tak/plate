// GitHub adapter — uses the REST API directly from the browser.
// Auth: OAuth access token with `repo` scope. Stored in localStorage.
//
// Endpoints used:
//   GET  /repos/{owner}/{repo}/contents/{path}      -> list / read
//   PUT  /repos/{owner}/{repo}/contents/{path}      -> write (create or update)

import type { RemoteFile } from '..'

const REPO_KEY = 'plate.sync.gh.repo' // "owner/repo"
const BRANCH = 'main'

function getRepo(): string {
  const r = localStorage.getItem(REPO_KEY)
  if (!r) throw new Error('No repo configured. Set plate.sync.gh.repo = "owner/repo".')
  return r
}

export const githubAdapter = {
  async list(token: string): Promise<RemoteFile[]> {
    const repo = getRepo()
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/notes?ref=${BRANCH}`,
      { headers: ghHeaders(token) }
    )
    if (res.status === 404) return [] // empty repo
    if (!res.ok) throw new Error(`GitHub list failed: ${res.status}`)
    const items = (await res.json()) as Array<{ name: string; sha: string; type: string }>
    const files: RemoteFile[] = []
    for (const it of items) {
      if (it.type !== 'file' || !it.name.endsWith('.md')) continue
      const r = await fetch(
        `https://api.github.com/repos/${repo}/contents/notes/${it.name}?ref=${BRANCH}`,
        { headers: ghHeaders(token) }
      )
      if (!r.ok) continue
      const j = await r.json()
      files.push({
        path: it.name,
        sha: j.sha,
        body: atob(j.content.replace(/\n/g, '')),
      })
    }
    return files
  },

  async write(token: string, file: RemoteFile): Promise<void> {
    const repo = getRepo()
    const path = file.path.includes('/') ? file.path : `notes/${file.path}`
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: ghHeaders(token),
        body: JSON.stringify({
          message: `plate: update ${file.path}`,
          content: btoa(unescape(encodeURIComponent(file.body))),
          sha: file.sha || undefined,
          branch: BRANCH,
        }),
      }
    )
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`GitHub write failed: ${res.status} ${t}`)
    }
  },
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}
