# CivicPath

> AI-powered civic education PWA — guides Indian voters step-by-step through the election process.

## Tech Stack

- **Frontend:** React 19 + Vite 8 + TypeScript (strict) + Tailwind CSS v4
- **State:** Zustand (persisted)
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **AI:** Gemini 1.5 Flash (via secure Supabase Edge Function)
- **Hosting:** Google Cloud Run (asia-south1)
- **CI/CD:** Cloud Build

## Quick Start (Local Dev)

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm test` | Run unit tests (Vitest) |
| `npm run typecheck` | TypeScript strict check |
| `npx playwright test` | Run E2E tests |
| `npm run build` | Production build |

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for the complete deployment runbook.

## Security

- `GEMINI_API_KEY` lives ONLY in Supabase Edge Function secrets — never in the client bundle
- All DB access gated by JWT + Row Level Security
- No server-side secrets in any `VITE_` prefixed variable
