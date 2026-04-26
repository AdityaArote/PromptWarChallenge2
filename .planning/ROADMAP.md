# ElectIQ — Roadmap
> Milestone 1: 48-Hour Hackathon Build (v1.0.0)

---

## Phase 1 — Foundation (H0–H8)
**Goal:** Working streaming chatbot end-to-end with repo scaffold, Supabase schema, and Vertex AI credentials.
**Status:** ✅ Complete (H0–H8)
**Plans:** 01-01-SUMMARY.md ✓ · 01-02-SUMMARY.md ✓ · 01-03-SUMMARY.md ✓
**Depends on:** —

Deliverables:
- Repo scaffold: Vite 5 + React 18 frontend, FastAPI backend, Docker Compose orchestration
- Supabase project init + schema migration (sessions, checklist_items, quiz_scores, fact_check_flags)
- Vertex AI credentials + `/api/chat/stream` SSE endpoint (Gemini 1.5 Flash)
- React `ChatWindow` component with streaming token display
- Anonymous Supabase Auth session flow
- Environment variable management (.env, .gitignore enforced)

---

## Phase 2 — Core Features (H8–H20)
**Goal:** Interactive Timeline + Voter Checklist + Google Translate + Misinformation Buster all live.
**Status:** ✅ Complete (H8–H20)
**Depends on:** Phase 1
**Plans:** 02-01-SUMMARY.md ✓ · 02-02-SUMMARY.md ✓

Deliverables:
- Interactive Election Timeline (static JSON data, click-to-expand slide-over panels, Framer Motion)
- Voter Checklist (Supabase CRUD, progress bar, persistent across refreshes)
- Google Translate API integration + language switcher (10 priority languages pre-baked at build time)
- Misinformation Buster: RAG pipeline (100-item JSON KB, Vertex AI embeddings, Gemini grounded prompt)
- Fact-check UI with verdict badge (TRUE/FALSE/MISLEADING/CONTEXT-DEPENDENT)
- `/api/fact-check` endpoint with caching + flagging

---

## Phase 3 — Maps & Quiz (H20–H32)
**Goal:** Full feature set complete — Maps locator, Quiz engine, Badge system, Leaderboard.
**Status:** 📋 Planned
**Plans:** 03-PLAN-maps-quiz.md
**Depends on:** Phase 2

Deliverables:
- Google Maps JS API integration via `@vis.gl/react-google-maps` (Places Search, top 5 pins + list cards)
- Browser Geolocation with manual address fallback
- Directions link to Google Maps (walking/driving/transit)
- Quiz engine: Vertex AI question generation (10 MCQ) + static JSON fallback
- Badge system: Supabase `quiz_scores` write on completion
- Leaderboard: top 10 anonymous aliases (`/api/quiz/leaderboard`)

---

## Phase 4 — Polish & QA (H32–H44)
**Goal:** Production-quality code: accessibility, responsive design, test coverage ≥70%, all error/loading states.
**Status:** 📋 Planned
**Plans:** 04-PLAN-polish-qa.md
**Depends on:** Phase 3

Deliverables:
- Accessibility pass: axe-core sweep, ARIA labels, keyboard nav, `prefers-reduced-motion`
- Responsive design QA (mobile viewport, 44×44px touch targets, RTL for Arabic/Hebrew/Urdu)
- Backend unit + integration tests ≥70% line coverage (pytest-cov)
- Frontend component tests (Vitest + RTL), hook tests, MSW mocks
- Error boundaries, loading skeletons, empty states for all 7 feature modules
- Code quality: ruff + black (Python), ESLint + Prettier (JS), mypy --strict

---

## Phase 5 — Demo Prep (H44–H48)
**Goal:** Submission-ready project + confident pitch.
**Status:** 📋 Planned
**Plans:** 05-PLAN-demo-prep.md
**Depends on:** Phase 4

Deliverables:
- Backup demo video recording (in case of live failure)
- Judge-facing README with architecture diagram
- 5-minute pitch walkthrough rehearsal
- Final `docker-compose up` smoke test
- All secrets confirmed out of git history
