# ElectIQ — Project State

**Last Updated:** 2026-04-26
**Current Milestone:** 1 — 48-Hour Hackathon Build
**Active Phase:** 3 — Google Maps + Civic Quiz

## Status
- Phase 1: ✅ Complete — Monorepo scaffold, SSE chat, Supabase schema, auth
- Phase 2: ✅ Complete — Timeline, Checklist, Translate, RAG Fact-Check, Navbar
- Phase 3: 🔲 Not started — Google Maps + Civic Knowledge Quiz
- Phase 4–5: 🔲 Not started

## Phase 2 Deliverables (Completed)
- `election_phases.json` — 7-phase election timeline (all voter types)
- `GET /api/timeline` — voter-type-filtered endpoint
- `GET /api/checklist` + `PUT /api/checklist/{id}` — Supabase CRUD with 7 default seeds
- `GET /api/translate/bundle?lang=xx` — Google Translate v3 with 24h TTL cache, 10 languages
- `POST /api/fact-check` — RAG (textembedding-gecko@003 + cosine) → Gemini JSON verdict, SHA-256 dedup
- `POST /api/fact-check/flag` → `fact_check_flags` Supabase table
- `misinformation_kb.json` — 22 verified election claims
- Frontend: `PhaseCard`, `PhaseDetail` (slide-over), `Timeline` page
- Frontend: `useChecklist` (optimistic toggle), `ChecklistItem`, `Checklist` page
- Frontend: `i18n/index.ts`, `en.json`, `LanguageSwitcher` (RTL support)
- Frontend: `Navbar` (translated labels, active state), `FactCheck` page
- Routes live: `/timeline`, `/checklist`, `/fact-check`
- TypeScript: 0 errors across all Phase 2 files

## Key Decisions
- Streaming via SSE (not WebSocket) — simpler, works with FastAPI `StreamingResponse`
- Anonymous Supabase auth by default — no sign-up friction
- Static JSON for election data + quiz questions — offline-safe, no DB reads
- RAG for misinformation buster — in-memory cosine over 22 KB items (no vector DB needed)
- `init_rag()` in FastAPI `lifespan` — graceful skip if VERTEX_AI credentials missing
- TTLCache(86400s) on translate — one API call per language per day
- All Google Cloud credentials server-side only — React never touches raw keys
- Rate limit: 30/min chat, 20/min fact-check

## Architecture
```
React (Vite) SPA → FastAPI REST + SSE → [Vertex AI | Translate API | Supabase] ←→ Google Maps (client-side)
```

## Current Focus — Phase 3
Next: Google Maps Places API (polling booth locator) + Civic Knowledge Quiz (10 questions, scoring, badge)
