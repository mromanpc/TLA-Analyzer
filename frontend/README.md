# Frontend (Tailwind configured)

This React app is pre-wired with TailwindCSS.

## Dev
```bash
npm i
npm run dev
```

If your backend runs somewhere else, set:
```
echo 'VITE_PROVER_URL="http://localhost:8787/api/prove"' > .env
```

---

### 🔌 Pointing to a backend at runtime
- Env: set `VITE_PROVER_URL` in `frontend/.env`
- URL param: append `?prover=https://your-backend.example.com/api/prove` to the page URL (it saves to `localStorage`)
- Same-origin: if the backend is reverse-proxied under `/api`, it will auto-use `window.location.origin + /api/prove`.
