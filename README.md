# Plate

An editorial-broadside notes PWA. Markdown editor, offline-first, syncs to GitHub, Google Drive, or OneDrive. The whole UI follows the Henry style system (warm monochrome, paper/ink inversion, no shadows, one radius).

## Stack

- **Vite 7** + **React 19** + **TypeScript**
- **Tailwind v4** with the token system pulled directly from `DESIGN.md`
- **CodeMirror 6** for the editor
- **idb** for the local IndexedDB vault
- **react-router-dom 7**
- **Workbox-style** manual Service Worker for offline-first

## Project structure

```
src/
  index.css              # Tailwind v4 + token system (@theme block)
  main.tsx               # Entry — registers SW in production
  App.tsx                # Routes + editorial closer
  pwa.ts                 # SW registration
  components/            # Nav, StampedHeader, InvertedLetter, BrandTicker,
                         # Editor (CodeMirror), FileTree, etc.
  pages/                 # Home, Notes, Settings, SyncCallback
  vault/                 # IndexedDB store
  hooks/                 # useVault (React-friendly vault hook)
  sync/                  # Adapter pattern over GitHub / Drive / OneDrive
    index.ts             # Public API: connect / disconnect / pull / push
    adapters/github.ts
    adapters/gdrive.ts
    adapters/onedrive.ts
public/
  manifest.webmanifest
  sw.js                  # Service worker (stale-while-revalidate)
  favicon.svg
```

## Local dev

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build
npm run preview      # serve the production build locally
```

The Service Worker is disabled in dev (Vite HMR + SW caches fight).

## Sync configuration

To wire a real sync backend, register OAuth apps and set the client IDs in a `.env.local`:

```env
VITE_GH_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
VITE_MS_CLIENT_ID=...
```

For GitHub, you also need to set `localStorage['plate.sync.gh.repo']` to `owner/repo` once you have a repo to sync into.

The current scaffold is wired end-to-end — once the client IDs are set, the Settings page "Connect" button opens the provider's OAuth flow and stores the resulting token in `localStorage`. No server required.

## Deploy

The build output is fully static (`./dist`), so it deploys to any static host. For GitHub Pages:

```bash
npm run build
# then push ./dist to a `gh-pages` branch, or use `gh actions`
```

For a personal Tailscale serve, drop the same `dist/` behind Caddy with a self-signed cert or a real one from Tailscale Funnel.

## Design system

The whole UI is governed by the tokens in `src/index.css`, which mirror the `DESIGN.md` spec verbatim. The Do's and Don'ts from the design file are enforced by the components — there is no colored CTA, no shadow, no third surface color, no border-radius other than 12px.

## Roadmap

- [ ] Markdown preview pane (split view)
- [ ] Frontmatter support
- [ ] Full-text search
- [ ] Daily note template
- [ ] Real-time sync via polling on app focus
- [ ] Graph view (Obsidian-style)

## License

MIT.
