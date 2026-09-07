# Digital Wallet — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS. Replaces the previous
Streamlit UI.

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`       | Dev server on http://localhost:3000      |
| `npm run build`     | Production build (`output: standalone`)  |
| `npm run lint`      | ESLint (`next/core-web-vitals`)          |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run test:e2e`  | Playwright E2E (needs the stack running) |

## End-to-end tests

Playwright specs live in `e2e/`. They exercise the full stack, so bring it up
first:

```bash
docker compose up -d --build   # from the repo root
cd frontend && npm run test:e2e
```

Target something other than Nginx with `E2E_BASE_URL` (e.g.
`E2E_BASE_URL=http://localhost:3000` against `npm run dev`).

## Environment

| Variable              | Default                 | Purpose                                                     |
| --------------------- | ----------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `/api`                  | API base the browser uses (baked in at build time).       |
| `API_PROXY_TARGET`    | `http://localhost:8000` | Where `npm run dev` rewrites `/api/*` (dev / non-Nginx).  |

Local (Docker/Nginx): leave `NEXT_PUBLIC_API_URL` unset — the relative `/api`
default is proxied to FastAPI. Hosted (Vercel): set it to the absolute Render
URL, e.g. `https://wallet-api.onrender.com`.

## Structure

```
src/
  app/
    (auth)/        login, register, forgot-password  — redirects to /dashboard when signed in
    (app)/         dashboard, add-funds, transfer, history, settings — guarded, wrapped in AppShell
  components/      UI primitives, AppShell, Logo, Modal, TransferForm/TransferModal, ThemeToggle
  lib/
    api.ts         typed FastAPI client (NEXT_PUBLIC_API_URL)
    auth.tsx       AuthProvider (JWT in localStorage) + useAuth()
    theme.tsx      ThemeProvider + useTheme() — light/dark/system, class-based, no-flash
    format.ts      currency / date / counterparty helpers
```
