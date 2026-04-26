# ElectIQ — Project State

**Last Updated:** 2026-04-26
**Current Milestone:** 1 — 48-Hour Hackathon Build
**Active Phase:** 1 — Foundation

## Status
- Phase 1: 🔲 Planning in progress
- Phase 2–5: 🔲 Not started

## Key Decisions
- Streaming via SSE (not WebSocket) for chat — simpler to implement, works with FastAPI `StreamingResponse`
- Anonymous Supabase auth by default — no sign-up friction; progress auto-persists
- Static JSON for election data, quiz questions, and misinformation KB — offline-safe, easily testable
- RAG for misinformation buster — in-memory vector list (no vector DB required for 100 items)
- All Google Cloud credentials live exclusively in FastAPI layer — React never touches raw API keys
- Maps API key restricted to `localhost:5173` HTTP referrer in Cloud Console
- Docker Compose orchestrates frontend + backend for single `docker-compose up` local demo

## Architecture
```
React (Vite) SPA → FastAPI REST + SSE → [Vertex AI | Translate API | Supabase] ←→ Google Maps (client-side)
```

## Open Risks
- Vertex AI quota limits during live demo — mitigated by static JSON fallbacks on every AI feature
- Google Maps Places API rate limits — mitigated by per-session geolocation caching
- 48-hour time box — Phase 1-2 front-loads highest-risk AI features
