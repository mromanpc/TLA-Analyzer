# TLA+ NLP Requirements Analyzer & Prover (Tailwind-ready)

This archive includes:
- **frontend/** Vite + React with Tailwind configured
- **backend/** Express mock prover API

## Run
```bash
# Terminal 1
cd backend
npm i
npm run dev

# Terminal 2
cd ../frontend
npm i
npm run dev
```

---

## ☁️ One‑click Deploy (backend)
After you push this repo to GitHub under **YOUR-USERNAME/YOUR-REPO**, you can enable one-click deploys:

### Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YOUR-USERNAME/YOUR-REPO)

### Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR-USERNAME/YOUR-REPO)

> Replace `YOUR-USERNAME/YOUR-REPO` above with your actual GitHub repo URL.

### Frontend live link
If you already deployed the frontend to GitHub Pages, set the backend URL at runtime using a query param:
```
https://YOUR-USERNAME.github.io/tla-analyzer/?prover=https://your-backend.example.com/api/prove
```
