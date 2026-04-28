# ElectIQ — Frontend

> React · TypeScript · Vite · Tailwind CSS

This is the frontend module of **ElectIQ**, an AI-powered multilingual election guide built for the Prompt Wars challenge (Civic Education vertical).

## What this app does

ElectIQ helps citizens navigate elections with confidence. From this frontend you can:

- **💬 Chat with an AI assistant** about voting rules, registration, and election procedures
- **🗓️ Browse the Election Timeline** — a step-by-step breakdown of the electoral lifecycle
- **✅ Manage your Voter Checklist** — personalised tasks persisted to Supabase per session
- **🔍 Fact-check claims** using a RAG-powered verdict engine (`TRUE / FALSE / MISLEADING / CONTEXT-DEPENDENT`)
- **📍 Find your Polling Booth** on an interactive map using your current location
- **🧠 Take the Civic Quiz** — AI-generated questions with badge awards
- **🌐 Switch language** — 10 languages translated on-demand via Cloud Translation API

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS |
| Maps | `@vis.gl/react-google-maps` |
| Auth | Supabase anonymous auth |
| i18n | `react-i18next` + Cloud Translation v3 backend |
| Routing | React Router v7 |

## Local development

```bash
cp .env.example .env   # fill in your VITE_ keys
npm install
npm run dev            # starts at http://localhost:5173
```

## Environment variables

See `.env.example` at this directory level for all required variables:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend Cloud Run URL (empty string = use Vite proxy) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `VITE_MAPS_API_KEY` | Google Maps JS API key |

## Architecture notes

- **API proxy**: In development, Vite proxies `/api` to `localhost:8000`. In production, `VITE_API_BASE_URL` is injected at Docker build time as an `ARG`.
- **Language switching**: Translation bundles are fetched lazily on first language selection, registered in `i18n`, and cached for 24 hours server-side. The `LanguageSwitcher` component shows a "Translating…" pulse state during the fetch.
- **Anonymous auth**: The app calls `supabase.auth.signInAnonymously()` on load. The resulting JWT is included as `Authorization: Bearer <token>` on all API requests.

## Build for production

```bash
npm run build          # outputs to dist/
npm run preview        # serves the production build locally
```

The Dockerfile uses a multi-stage build: `node:20-slim` to compile, then `nginx:alpine` to serve.
