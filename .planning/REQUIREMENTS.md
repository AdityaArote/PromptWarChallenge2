# ElectIQ — Requirements
> Source: ElectIQ_PRD.docx · Extracted 2026-04-26

---

## REQ-001: Conversational AI Chatbot
- Model: Gemini 1.5 Flash via Vertex AI
- Delivery: Streaming SSE — token-by-token output to browser (`/api/chat/stream` POST)
- System prompt constrained to election topics only; responds in detected language
- Conversation memory: last 6 exchanges stored in Zustand, passed as history array to Gemini
- 6 starter prompt chips: "How do I register?", "What ID do I need?", etc.
- Fallback: pre-written FAQ answers from static JSON if Vertex AI unavailable
- Input sanitisation: strip HTML/script tags server-side (bleach) before forwarding to model
- Rate limiting: 30 req/min per session (slowapi middleware)
- Endpoints: `POST /api/chat/stream`, `GET /api/chat/history`, `GET /api/faq`

## REQ-002: Interactive Election Timeline
- Horizontally scrollable, animated visual of full election lifecycle
- 7 phases: Announcement, Campaign Period, Voter Registration Deadline, Pre-Poll Silence, Voting Day, Counting, Official Results & Swearing-In
- Each phase node clickable → slide-over panel with: plain-language explanation, typical duration, key voter actions, "What should I do?" micro-CTA feeding into Voter Checklist
- Built with Framer Motion (stagger animations)
- Data served from static JSON committed to repo

## REQ-003: Multilingual Support
- 50+ languages via two-pronged approach
- UI strings: react-i18next with English base; Google Translate API pre-generates JSON bundles for 10 priority languages at build time
- Chatbot: Gemini zero-shot multilingual (responds in detected language of user message)
- Dynamic translation: user dropdown → instant re-render from cached bundle or live Translate API fetch
- RTL support: Tailwind `dir="rtl"` for Arabic, Hebrew, Urdu
- Translation bundles cached in-memory (TTL 24h)
- Translated bundles endpoint: `GET /api/translate/bundle?lang={code}`

## REQ-004: Polling Booth Locator
- Map library: `@vis.gl/react-google-maps` (official React wrapper)
- Geolocation: Browser Geolocation API with fallback to manual address input
- Search: Google Places Text Search for "polling station" near coordinates
- Results: top 5 as map pins + list cards (name, address, distance)
- Directions: opens Google Maps in new tab (walking/driving/transit)
- Accessibility: ARIA label on map, list view as primary for screen readers, keyboard-navigable result cards
- Maps API key restricted to `localhost:5173` HTTP referrer
- User coordinates never stored in Supabase

## REQ-005: Voter Checklist & Step Tracker
- Default items: Check registration status · Confirm polling booth location · Prepare valid ID · Arrange transport · Plan voting time · Learn about candidates · Understand ballot format
- State persists via Supabase `checklist_items` table (RLS: session_id = auth.uid())
- Progress bar derived from completed/total ratio
- Supabase CRUD: upsert on toggle, fetch on load
- Endpoints: `GET /api/checklist`, `PUT /api/checklist/{item_id}`

## REQ-006: Quiz & Gamification
- 10 AI-generated MCQ questions via Vertex AI (`/api/quiz/generate` POST)
- Static JSON fallback (50+ pre-written questions) if Vertex AI unavailable
- Badge system: badge slug stored in `quiz_scores` on completion
- Leaderboard: top 10 anonymous aliases (`/api/quiz/leaderboard` GET)
- Endpoints: `POST /api/quiz/generate`, `POST /api/quiz/submit`, `GET /api/quiz/leaderboard`

## REQ-007: Misinformation Buster
- Architecture: RAG — claim → embedding → top-k KB lookup → Gemini grounded prompt
- Knowledge base: ~100 curated election myths/facts in static JSON; embedded at startup
- Embedding model: Vertex AI `textembedding-gecko` (768-dim), cosine similarity for retrieval
- Verdicts: TRUE / FALSE / MISLEADING / CONTEXT-DEPENDENT (structured JSON)
- Output: verdict badge + 2–3 sentence plain-language explanation + up to 2 source references
- Tone: non-partisan, factual
- Caching: identical claims (hash-matched) return cached response
- User flagging: stored in Supabase `fact_check_flags` table

## REQ-008: Security
- All API keys in `.env`; never committed; `.gitignore` enforced; Docker secrets mount
- Input sanitisation with `bleach` library on all user text
- Rate limiting: slowapi — 30 chat req/min, 5 quiz gen/min per session
- Supabase RLS on all tables
- CORS: FastAPI allows only `http://localhost:5173`
- Maps API key restricted by HTTP referrer
- Gemini system prompt guards against prompt injection
- No PII storage: user geolocation never persisted
- `pip-audit` + `npm audit` in CI pre-push hook

## REQ-009: Accessibility (WCAG 2.1 AA)
- Full keyboard navigation; visible focus ring; no keyboard traps
- ARIA roles, labels, live regions on chat stream, timeline, map results
- Colour contrast ≥ 4.5:1 for all text/background combos (axe-core verified)
- Relative units (rem) throughout; tested at 200% browser zoom
- `HTML lang` attribute dynamically updated on language switch
- Map: `role="application"` + `aria-label`; equivalent keyboard-navigable list view
- `prefers-reduced-motion` respected; Framer Motion animations disabled when set
- All inputs have `<label>` or `aria-label`; no placeholder-only labelling
- Inline error text with `role="alert"`; never colour-only errors
- Minimum 44×44px touch targets

## REQ-010: Testing
- Backend: pytest — unit (Pydantic validation, sanitisation, RAG scoring, rate-limit logic) + integration (FastAPI TestClient all endpoints); Vertex AI + Translate mocked with respx; ≥70% line coverage (pytest-cov)
- Frontend: Vitest + RTL — component tests (ChatWindow, TimelinePhase, QuizCard, ChecklistItem, FactCheckResult) + hook tests (useChatStream, useChecklist); axe-core integrated; MSW for API mocking

## REQ-011: Database Schema
- `sessions`: id (uuid PK), alias (text "Voter #NNNN"), lang_code (text), created_at
- `checklist_items`: id, session_id (FK+RLS), item_id, label, completed (bool), completed_at
- `quiz_scores`: id, session_id (FK+RLS), score (int2), badge (text nullable), taken_at
- `fact_check_flags`: id, claim, verdict_returned, flagged_by (FK), created_at
- RLS enabled on all tables

## REQ-012: Code Quality
- Python: ruff (zero warnings), black (formatting), mypy --strict, pre-commit hooks
- JS/TS: ESLint Airbnb config (zero errors before build), Prettier (auto-format on save)
- Git hooks: pre-commit (Python) + husky (JS) — run linters + tests before push
