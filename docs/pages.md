# GitHub Pages

This site is built with Vite and deployed to the `gh-pages` branch via GitHub Actions. The workflow is at `.github/workflows/deploy.yml`.

To enable Pages for this repo:

1. Go to **Settings → Pages**
2. Under **Source**, pick **Deploy from a branch**
3. Branch: `gh-pages`, folder: `/` (root)
4. Save

After the first `main` push, the action will create the `gh-pages` branch automatically. Pages will be live at:

```
https://<your-username>.github.io/plate/
```
