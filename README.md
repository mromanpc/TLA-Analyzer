# TLA+ NLP Requirements Analyzer & Prover

Turn TLA+ modules into actionable requirements, rewrite NFRs into TLA+ monitor templates, and run quick proof checks through a backend API.

**Live demo:**  
https://Shubha-ml.github.io/TLA-Analyzer/?prover=https://your-backend.example.com/api/prove  
Replace the backend URL with your deployed API. The app will remember it.

---

## What it does
- Extracts candidate requirements from comments and spec cues in a `.tla` file
- Classifies each as Functional or Non-functional and sets a priority
- Suggests concise rewrites and acceptance criteria
- Rewrites NFRs into ready-to-paste TLA+ “monitor” snippets with a theorem
- Calls a prover API for quick checks, with a clear mock fallback if unreachable
- Exports requirements to JSON and CSV (UTF-8 BOM for Excel)

---

## Run locally

### Backend
```bash
cd backend
npm i
npm run dev
# http://localhost:8787
