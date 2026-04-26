# Phase 2: Core Features — Context

**Gathered:** 2026-04-26
**Status:** Ready for planning
**Source:** PRD Express Path (ElectIQ_PRD.docx)

<domain>
## Phase Boundary

Phase 2 delivers four major feature modules on top of the Phase 1 foundation: Interactive Election Timeline, Voter Checklist, Multilingual Support (Google Translate API), and the Misinformation Buster (RAG pipeline). All four must be live and functional by end of this phase.
</domain>

<decisions>
## Implementation Decisions

### Interactive Election Timeline (REQ-002)
- Static JSON file: `backend/data/election_phases.json` — 7 phase objects
- Each object: `{ id, phase_order, title, description, duration, voter_actions, cta_text, icon }`
- Frontend: `frontend/src/pages/Timeline.tsx` — horizontally scrollable on mobile, vertical on desktop
- Click → Framer Motion `AnimatePresence` slide-over panel from right (Sheet component)
- "What should I do?" CTA in slide-over pre-fills checklist with phase-specific actions
- Stagger animation: `staggerChildren: 0.08`, card: `{opacity: 0, y: 24}` → `{opacity: 1, y: 0}`
- Endpoint: `GET /api/timeline` (returns JSON from static file, no DB needed)

### Voter Checklist (REQ-005)
- 7 default items with stable `item_id` values: `check_registration`, `confirm_booth`, `prepare_id`, `arrange_transport`, `plan_voting_time`, `learn_candidates`, `understand_ballot`
- On first load: fetch existing items from Supabase; if empty, upsert all 7 defaults
- Toggle: optimistic UI update → `PUT /api/checklist/{item_id}` → Supabase upsert
- Progress bar: animated width transition, `completedCount / totalCount * 100`
- Endpoints: `GET /api/checklist`, `PUT /api/checklist/{item_id}`

### Multilingual Support (REQ-003)
- `react-i18next` with English base strings in `frontend/src/i18n/en.json`
- 10 priority language bundles pre-generated at build time: `en, hi, es, fr, ar, zh, ur, pt, bn, ru`
- Backend endpoint: `GET /api/translate/bundle?lang={code}` — returns cached translated bundle
- Frontend: `LanguageSwitcher` dropdown component, updates `i18n.changeLanguage(code)`
- Zustand `appStore`: persists `selectedLang` in localStorage
- RTL: `document.documentElement.setAttribute('dir', 'rtl')` for `ar, he, ur`
- Translation cache: `cachetools.TTLCache(maxsize=100, ttl=86400)` in backend

### Misinformation Buster — RAG Pipeline (REQ-007)
- Knowledge base: `backend/data/misinformation_kb.json` — array of 30+ `{claim, verdict, explanation, sources[]}`
- Embeddings: computed at startup using `textembedding-gecko` model, stored as in-memory list of `{claim, embedding, verdict, explanation, sources}`
- At query time: embed user's claim → cosine similarity against all KB entries → top-3 → inject into Gemini prompt as grounding context
- Verdict: `TRUE | FALSE | MISLEADING | CONTEXT-DEPENDENT` — extracted from structured Gemini JSON response
- Caching: `hashlib.sha256(claim.encode()).hexdigest()` as cache key, `TTLCache(maxsize=500, ttl=3600)`
- User flagging: `POST /api/fact-check/flag` → insert into `fact_check_flags` table
- Frontend: `frontend/src/pages/FactCheck.tsx` — text input + verdict card with badge color coding
- Endpoints: `POST /api/fact-check`, `POST /api/fact-check/flag`

### the agent's Discretion
- Exact Tailwind classes and colour tokens for timeline phase cards
- Framer Motion easing curves (use `easeOut` for entrances)
- Language selector UI (dropdown vs. modal)
- Number of misinformation KB entries (minimum 20, target 30+)
</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/01-foundation/01-CONTEXT.md` — architecture decisions, auth pattern, apiFetch helper
- `.planning/REQUIREMENTS.md` — REQ-002, REQ-003, REQ-005, REQ-007
- `backend/services/vertex.py` — Vertex AI model initialization pattern to reuse
- `backend/services/supabase_client.py` — `verify_session` dependency to reuse
- `backend/services/sanitise.py` — `sanitise()` to call before all user inputs to Vertex AI
</canonical_refs>

<specifics>
## Specific Ideas

- Timeline JSON must use a `voter_types` array on each phase (e.g. `["first_time", "returning", "overseas"]`) to support future filtering
- Misinformation buster system prompt: "You are a non-partisan election fact-checker. Given the following verified election facts as context, evaluate the user's claim and return ONLY valid JSON: {\"verdict\": \"TRUE|FALSE|MISLEADING|CONTEXT-DEPENDENT\", \"explanation\": \"2-3 sentences\", \"sources\": [\"source1\"]}"
- cosine similarity: `numpy.dot(a, b) / (numpy.linalg.norm(a) * numpy.linalg.norm(b))`
- Embeddings are 768-dimensional; startup embedding of 30 items takes ~2–3 seconds — log it
- Translate bundle: use `google.cloud.translate_v3.TranslationServiceClient.translate_text()`
</specifics>

<deferred>
## Deferred Ideas

- Live Google Translate for arbitrary user-typed content (not UI strings) — Phase 4
- Leaderboard for fact-check accuracy — out of scope
- Maps integration — Phase 3
- Quiz engine — Phase 3
</deferred>

---
*Phase: 02-core-features*
*Context gathered: 2026-04-26 via PRD Express Path*
