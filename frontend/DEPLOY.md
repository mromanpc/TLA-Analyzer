# Deploy to GitHub Pages

These steps publish the **frontend** to GitHub Pages using the `gh-pages` branch.
The backend should be hosted separately (Render/Heroku/Railway/etc.) and referenced via `VITE_PROVER_URL`.

## One-time
```bash
cd frontend
npm install
```

## Build & deploy
```bash
# set backend URL if not on localhost
# echo 'VITE_PROVER_URL="https://your-backend.example.com/api/prove"' > .env

npm run build
npm run deploy
```

### Repository path
This config assumes the repo name is **tla-analyzer** and sets Vite:
```js
export default defineConfig({
  base: '/tla-analyzer/',
})
```
If your repository name differs, change the `base` value to match '/YOUR-REPO-NAME/' and redeploy.

### Live URL
Your app will be available at:
```
https://YOUR-USERNAME.github.io/tla-analyzer/
```
