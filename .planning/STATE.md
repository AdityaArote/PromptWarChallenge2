# ElectIQ — Project State

**Last Updated:** 2026-04-26
**Current Milestone:** 1 — 48-Hour Hackathon Build
**Active Phase:** 2 — Core Features

## Status
- Phase 1: ✅ Complete (3/3 plans done — H0–H8)
- Phase 2: 🔲 Not started
- Phase 3–5: 🔲 Not started

## Phase 1 Deliverables (Completed)
- Vite 5 + React 18 + TypeScript frontend (`frontend/`)
- FastAPI backend with CORS + rate limiting (`backend/`)
- Docker Compose orchestration with health-check (`docker-compose.yml`)
- Supabase schema: 4 tables + RLS migration (`supabase/migrations/`)
- Anonymous Supabase auth + JWT injection (`useAuth`, `apiFetch`, `verify_session`)
- SSE streaming chat: `/api/chat/stream` → Gemini 1.5 Flash
- Zustand `chatStore` with `persist` middleware
- `useChatStream` hook — ReadableStream SSE consumer
- `ChatWindow`, `MessageBubble`, `TypingIndicator` components
- Offline fallback data: `faq.json`, `quiz_questions.json`, `i18n_base.json`

## Key Decisions
- Streaming via SSE (not WebSocket) — simpler, works with FastAPI `StreamingResponse`
- Anonymous Supabase auth by default — no sign-up friction; session auto-persists
- Static JSON for election data, quiz questions, misinformation KB — offline-safe, easily testable
- RAG for misinformation buster — in-memory vector list (no vector DB required for 100 items)
- All Google Cloud credentials server-side only — React never touches raw API keys
- Maps API key restricted to `localhost:5173` HTTP referrer in Cloud Console
- Docker Compose orchestrates frontend + backend for single `docker-compose up` local demo
- Rate limit: 30/minute on `/api/chat/stream` to protect Vertex AI quota
- Prompt injection guard in Gemini system prompt

## Architecture
```
React (Vite) SPA → FastAPI REST + SSE → [Vertex AI | Translate API | Supabase] ←→ Google Maps (client-side)
```

## Open Risks
- Vertex AI quota limits during live demo — mitigated by static JSON fallbacks on every AI feature
- Google Maps Places API rate limits — mitigated by per-session geolocation caching
- 48-hour time box — Phase 1-2 front-loads highest-risk AI features

## Current Focus — Phase 2
Next: Election Timeline + Voter Checklist + Google Translate + Misinformation Buster
