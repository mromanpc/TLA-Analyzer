# TLA+ NLP Requirements Analyzer & Prover

Turn TLA+ modules into actionable requirements, rewrite NFRs into TLA+ monitor templates, and run quick proof checks through a backend API.

**Live site (GitHub Pages)**
https://Shubha-ml.github.io/TLA-Analyzer/

csharp
Copy code

**Use your backend by adding a query param**
?prover=https://YOUR-BACKEND.onrender.com/api/prove

markdown
Copy code
The app saves this in `localStorage`, so you only add it once.

---

## Table of contents
- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Run locally](#run-locally)
- [Deploy (recommended: Pages + Render)](#deploy-recommended-pages--render)
- [Alternative deploys](#alternative-deploys)
- [Configuration](#configuration)
- [API](#api)
- [Security and CORS](#security-and-cors)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What it does
- Extracts candidate requirements from comments and spec cues in a `.tla` file
- Classifies each as Functional or Non-functional and sets a priority
- Suggests concise rewrites and acceptance criteria
- Rewrites NFRs into ready-to-paste TLA+ “monitor” snippets with a theorem
- Calls a prover API for quick checks, falls back to a clear mock result if unreachable
- Exports requirements to JSON and CSV, with UTF-8 BOM for Excel

---

## How it works
- **Frontend** (React + Vite + Tailwind) parses your TLA+ text, finds likely requirements, and renders an editor with filters, suggestions, and proof actions.
- **Backend** (Express) exposes `/api/prove`. It currently returns statuses with a mock strategy so you can demo immediately. You can swap in Apalache or TLAPS behind the same route later.
- **Backend URL resolution order**
  1. `VITE_PROVER_URL` (build time)
  2. `?prover=…` in the page URL
  3. Saved `localStorage` value
  4. Same origin `/api/prove`
  5. `http://localhost:8787/api/prove`

---

## Project structure
TLA-Analyzer/
├─ frontend/ # React + Vite + Tailwind
│ ├─ src/App.jsx # UI, NLP rules, exports, About
│ ├─ index.html
│ ├─ vite.config.js # base set for GitHub Pages
│ ├─ tailwind.config.js, postcss.config.js
│ └─ README.md
├─ backend/ # Express API
│ ├─ server.js # /api/prove, /health, CORS
│ ├─ Procfile, app.json # Heroku deploy
│ ├─ render.yaml # Render deploy
│ └─ README.md
└─ README.md # you are here

yaml
Copy code

---

## Run locally

### Backend
bash
cd backend
npm install
npm run dev

 -> http://localhost:8787

---

### Frontend
bash
Copy code
cd frontend
npm install
npm run dev
 -> http://localhost:5173

Point the frontend to your backend in one of three ways:

add .env in frontend with VITE_PROVER_URL="http://localhost:8787/api/prove"

open the site with ?prover=http://localhost:8787/api/prove

reverse proxy /api to your backend in dev

Vite dev proxy example (optional) in frontend/vite.config.js:

js
Copy code
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/TLA-Analyzer/",
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8787" } },
});
### Deploy (recommended: Pages + Render)
1) Backend on Render
Dashboard → New → Web Service → connect repo Shubha-ml/TLA-Analyzer

Root directory: backend

Build: npm install

Start: node server.js

Health check: /health

Deploy, copy your base URL: https://YOUR-BACKEND.onrender.com

Your API endpoint is https://YOUR-BACKEND.onrender.com/api/prove

Test:

bash
Copy code
curl https://YOUR-BACKEND.onrender.com/health
One-click buttons (after pushing your repo)
Heroku


### Render


2) Frontend on GitHub Pages
vite.config.js already has base: '/TLA-Analyzer/'

Build and deploy:

bash
Copy code
cd frontend
npm install
npm run build
npm run deploy

### Alternative deploys
Vercel (frontend) + Render or Heroku (backend)

Import frontend into Vercel, add VITE_PROVER_URL in Project Settings.

Render for both

Static Site for frontend (npm run build, publish dist), Web Service for backend.

Codespaces for a zero install demo

Start backend and frontend in two terminals, copy the forwarded URLs, set ?prover=.

### Configuration
Frontend
.env in frontend:

ini
Copy code
VITE_PROVER_URL="https://YOUR-BACKEND.onrender.com/api/prove"
Tailwind is preconfigured. Styles live in src/index.css:

css
Copy code
@tailwind base;
@tailwind components;
@tailwind utilities;
Backend
Default port: 8787

Health: /health

API: /api/prove

CORS is enabled for any origin by default

### API
POST /api/prove
Request

json
Copy code
{
  "tla": "---- MODULE Demo ----\n====",
  "moduleName": "Demo",
  "invariants": ["Invariant"]
}
Response

json
Copy code
{
  "perInvariant": [
    { "name": "Invariant", "status": "Proved" }
  ],
  "evidence": "Examined Demo with 1 invariant(s)."
}
### Security and CORS
Production recommendation, restrict origins:

js
Copy code
import cors from "cors";
const allowed = [
  "https://Shubha-ml.github.io",
  "https://Shubha-ml.github.io/TLA-Analyzer"
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin))
}));
### Troubleshooting
Message: “Prover backend unreachable. Used mock prover.”

Check backend:

bash
Copy code
curl https://YOUR-BACKEND.onrender.com/health
Use https:// in ?prover= since Pages is HTTPS.

Open DevTools → Network, inspect the /api/prove request.

Blank page on Pages

vite.config.js must have base: '/TLA-Analyzer/' and match the repo name exactly.

Rebuild and redeploy.

Styles look plain

Check that src/index.css imports Tailwind directives.

Make sure tailwind.config.js has:

js
Copy code
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
### FAQ
Does the tool upload my TLA+ file?
No, not until you click Prove. The proof request posts your TLA+ text to your configured backend URL.

Can I use TLAPS or Apalache?
Yes. Replace the mock logic in backend/server.js with calls to your prover and keep the same response shape.

Can I change the classification rules?
Yes. The heuristics live in frontend/src/App.jsx (FN_KEYWORDS, NFR_CLUSTERS, PRIORITY_RULES).

### Roadmap
Pluggable proof engines behind /api/prove

Stronger NLP and better rationales

Save and load requirement sets per module

Shareable links for filtered views

Unit tests for extractors and formatters

### Contributing
Issues and pull requests are welcome. Please describe the use case and attach a small .tla example when possible.
