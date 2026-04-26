# Phase 1: Foundation — Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Source:** PRD Express Path (ElectIQ_PRD.docx)

<domain>
## Phase Boundary

Phase 1 delivers the working skeleton of ElectIQ: a fully scaffolded monorepo (Vite + FastAPI + Docker Compose), a live Supabase database with the complete schema, Vertex AI credentials wired up, and a streaming AI chatbot working end-to-end in the browser. Everything built here becomes the foundation every subsequent phase builds on top of.

This phase does NOT include: the election timeline, checklist, maps, quiz, misinformation buster, translation, or accessibility pass — those are Phases 2–4.
</domain>

<decisions>
## Implementation Decisions

### Repo Structure
- Monorepo: `frontend/` (Vite + React 18) and `backend/` (FastAPI) at root level
- `docker-compose.yml` at root orchestrates both services + exposes ports 5173 (frontend) and 8000 (backend)
- `.env` at root (gitignored); `.env.example` committed with all required key names

### Frontend Scaffold
- `npm create vite@latest frontend -- --template react-ts` (React 18 + TypeScript)
- Tailwind CSS 3 via `@tailwindcss/vite` plugin
- Zustand for state management (`npm i zustand`)
- React Router v6 (`npm i react-router-dom`)
- Framer Motion (`npm i framer-motion`)
- react-i18next (`npm i react-i18next i18next`)
- shadcn/ui components: `npx shadcn-ui@latest init` after Tailwind setup

### Backend Scaffold
- Python 3.11 + FastAPI + Uvicorn
- `requirements.txt` includes: `fastapi`, `uvicorn[standard]`, `google-cloud-aiplatform`, `google-cloud-translate`, `supabase`, `python-dotenv`, `bleach`, `slowapi`, `cachetools`, `pydantic[email]`, `httpx`, `pytest`, `pytest-asyncio`, `httpx`, `respx`, `ruff`, `black`, `mypy`
- Entry point: `backend/main.py`
- Directory structure: `backend/routers/`, `backend/services/`, `backend/models/`, `backend/data/`

### Supabase Schema
All four tables created via Supabase SQL migration (committed to `supabase/migrations/`):
```sql
-- sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL DEFAULT 'Voter #' || floor(random()*9000+1000)::text,
  lang_code text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- checklist_items
CREATE TABLE checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id),
  item_id text NOT NULL,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);

-- quiz_scores
CREATE TABLE quiz_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id),
  score int2 NOT NULL,
  badge text,
  taken_at timestamptz NOT NULL DEFAULT now()
);

-- fact_check_flags
CREATE TABLE fact_check_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim text NOT NULL,
  verdict_returned text NOT NULL,
  flagged_by uuid NOT NULL REFERENCES sessions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: enable + policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_check_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON checklist_items FOR ALL USING (session_id = auth.uid());
CREATE POLICY "own rows" ON quiz_scores FOR ALL USING (session_id = auth.uid());
```

### Anonymous Auth Flow
- `supabase.auth.signInAnonymously()` on app mount if no session in localStorage
- JWT stored in localStorage, sent as `Authorization: Bearer <JWT>` header on all API calls
- FastAPI middleware validates JWT via `supabase.auth.get_user(token)`

### Streaming Chat (SSE)
- FastAPI endpoint: `POST /api/chat/stream`
- Returns `StreamingResponse` with `media_type="text/event-stream"`
- Vertex AI SDK: `GenerativeModel("gemini-1.5-flash").generate_content_async(messages, stream=True)`
- Each streamed chunk yields: `data: {"token": "<text>"}\n\n`
- Frontend: `EventSource`-compatible fetch with `ReadableStream` parsing
- System prompt: "You are an election information assistant. Answer only questions about elections, voting, and civic participation. Respond in the same language as the user's message."
- Conversation history: last 6 exchanges from Zustand `chatStore`, passed as `contents` array to Gemini

### ChatWindow Component
- Floating button (fixed bottom-right) → slide-up `AnimatePresence` panel (Framer Motion)
- Message list with user/assistant bubbles
- Typing indicator (3-dot animation) during streaming
- ARIA `role="log"` + `aria-live="polite"` on message list
- 6 starter prompt chips rendered when history is empty
- Input: controlled textarea, submit on Enter (Shift+Enter for newline)

### Environment Variables Required
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VERTEX_AI_PROJECT=
VERTEX_AI_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
```

### Docker Compose
```yaml
services:
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    env_file: .env
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    volumes:
      - ./credentials:/app/credentials:ro
```

### the agent's Discretion
- Exact shadcn/ui component selections (Button, Card, ScrollArea, Sheet for slide-over)
- Tailwind theme colour tokens (primary, secondary, accent — use a civic/trustworthy palette)
- Exact file names for router files, store files, service files
- Error handling granularity within SSE stream (reconnect logic, timeout)
</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured from PRD above.

### Key PRD Sections for Phase 1
- Section 4.1: Frontend stack
- Section 4.2: Backend stack
- Section 4.3: Infrastructure & Google Services
- Section 5: System Architecture
- Section 5.1: Key Architectural Decisions (SSE streaming, anonymous sessions)
- Section 6.1: Conversational AI Chatbot (full spec)
- Section 7: Database Schema
- Section 8: Security (env management, input sanitisation, CORS, rate limiting)
</canonical_refs>

<specifics>
## Specific Ideas

- The PRD explicitly says "All third-party API keys live exclusively in the FastAPI layer. The React frontend never touches raw Google Cloud credentials."
- Maps JS API key is the one exception — it is client-side but restricted by HTTP referrer
- Vertex AI streaming: use `stream=True` parameter with `generate_content_async`
- FastAPI CORS: `allow_origins=["http://localhost:5173"]` only
- Rate limiting: `slowapi` with `Limiter(key_func=get_remote_address)` — 30 req/min chat, 5 req/min quiz gen
- Input sanitisation: `bleach.clean(text, tags=[], strip=True)` before every Vertex AI call
</specifics>

<deferred>
## Deferred Ideas

- Production deployment (Cloud Run) — out of scope for this phase, demo runs on localhost
- Email sign-in upgrade for anonymous users — PRD mentions it, Phase 4 polish
- pip-audit / npm audit CI hook — Phase 4
- RTL layout — Phase 4
</deferred>

---
*Phase: 01-foundation*
*Context gathered: 2026-04-26 via PRD Express Path*
