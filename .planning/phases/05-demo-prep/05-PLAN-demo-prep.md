---
phase: 5
plan: 1
title: "Demo Prep — README, Smoke Test, Submission"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - README.md
  - SUBMISSION.md
requirements:
  - REQ-008
---

<objective>
Prepare the project for hackathon submission: write a judge-facing README with architecture diagram, confirm secrets are out of git, and run the final docker-compose smoke test.
</objective>

<tasks>

<task id="5.1.1">
<title>Write judge-facing README with architecture diagram</title>
<type>execute</type>
<read_first>
- .planning/STATE.md (architecture section)
- .planning/ROADMAP.md (all phases)
- .planning/REQUIREMENTS.md (all REQ-00x)
- docker-compose.yml
</read_first>
<action>
Create `README.md`:
```markdown
# ElectIQ 🗳️
> AI-powered civic education platform — making every election accessible to every voter.

**Hack2Skills × Google Hackathon Submission**

[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%201.5%20Flash-blue)](https://cloud.google.com/vertex-ai)
[![Google Maps](https://img.shields.io/badge/Google-Maps%20API-green)](https://developers.google.com/maps)
[![Translate](https://img.shields.io/badge/Cloud-Translation%20API-orange)](https://cloud.google.com/translate)

---

## 🎯 Problem Statement

Low voter turnout is caused by three root causes: **not knowing how to vote**, **not knowing where to vote**, and **not knowing what to believe**. ElectIQ attacks all three simultaneously through a single conversational, accessible, multilingual interface.

---

## ✨ Features

| Feature | Google Service | What It Does |
|---------|---------------|--------------|
| 🤖 AI Chatbot | Vertex AI (Gemini 1.5 Flash) | Streaming SSE chat — answers any election question in plain language |
| 🗓️ Election Timeline | — | 7-phase visual lifecycle with clickable explainer panels |
| 🌍 50+ Languages | Cloud Translation API v3 | Full UI translation + chatbot responds in user's language |
| 📍 Booth Locator | Google Maps JS API | Finds nearest voting centres with directions |
| ✅ Voter Checklist | Supabase | Personalised, persistent step-by-step participation tracker |
| 🧠 Quiz | Vertex AI (Gemini 1.5 Flash) | AI-generated civics MCQ with badge rewards |
| 🔍 Fact Checker | Vertex AI + RAG | Busts election misinformation with sourced verdicts |

---

## 🏗️ Architecture

```
React (Vite 5) SPA
       │ HTTPS
       ▼
FastAPI (Python 3.11) REST + SSE
       │
       ├──► Vertex AI (Gemini 1.5 Flash) — Chat, Quiz Gen, Fact-Check
       ├──► Cloud Translation API v3 — 50+ language bundles
       └──► Supabase (PostgreSQL + Auth + RLS) — Sessions, Checklist, Scores

Google Maps JS API (client-side, HTTP-referrer restricted)
```

**Key security decisions:**
- All Google Cloud API keys live **exclusively in FastAPI** — React never touches raw credentials
- Supabase RLS enforces row-level isolation per anonymous session
- Input sanitisation with `bleach` before every Vertex AI call
- Rate limiting: 30 chat req/min, 5 quiz gen/min (slowapi)

---

## 🚀 Quick Start

### Prerequisites
- Node 20+, Python 3.11+, Docker (optional)
- Supabase project (free tier)
- Google Cloud project with Vertex AI + Translation API + Maps API enabled

### Setup
```bash
# Clone and configure
cp .env.example .env
# Fill in .env with your Supabase and Google Cloud credentials

# Option A: Docker Compose (recommended)
docker-compose up

# Option B: Manual
cd backend && pip install -r requirements.txt && uvicorn main:app --reload &
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

### Supabase Schema
Run `supabase/migrations/20240101000000_init.sql` in your Supabase SQL Editor.

---

## 🧪 Testing

```bash
# Backend
cd backend && pytest tests/ --cov=. --cov-report=term-missing

# Frontend
cd frontend && npm test
```

---

## 📁 Project Structure

```
electiq/
├── frontend/               # Vite + React 18 + TypeScript
│   ├── src/
│   │   ├── components/     # ChatWindow, PhaseCard, ChecklistItem, QuizCard…
│   │   ├── pages/          # Home, Timeline, Checklist, Maps, Quiz, FactCheck
│   │   ├── hooks/          # useChatStream, useChecklist, useAuth
│   │   ├── store/          # Zustand stores (chat, app)
│   │   └── i18n/           # Translation bundles
│   └── Dockerfile
├── backend/                # FastAPI + Python 3.11
│   ├── routers/            # chat, timeline, checklist, quiz, fact_check, translate, maps
│   ├── services/           # vertex, rag, supabase_client, sanitise
│   ├── models/             # Pydantic models
│   ├── data/               # Static JSON (election phases, FAQ, quiz, i18n, KB)
│   └── tests/              # pytest test suite
├── supabase/
│   └── migrations/         # SQL schema
├── docker-compose.yml
└── .env.example
```

---

## 🔐 Security

- ✅ API keys never in client — all Google Cloud credentials server-side only
- ✅ Supabase RLS — anonymous users can only access their own rows
- ✅ Input sanitisation — `bleach.clean()` before every AI call
- ✅ Rate limiting — slowapi middleware on all AI endpoints
- ✅ CORS — restricted to localhost:5173 only
- ✅ Prompt injection guard — system prompt explicitly resists user instruction injection
- ✅ No PII storage — geolocation used in-flight only, never persisted

---

## ♿ Accessibility (WCAG 2.1 AA)

- Full keyboard navigation with visible focus rings
- ARIA live regions on chat stream and alerts
- `prefers-reduced-motion` respected
- Colour contrast ≥ 4.5:1 (axe-core verified in CI)
- RTL layout for Arabic, Hebrew, Urdu
- Screen-reader-first list view for Maps (alongside visual map)

---

## 👥 Team

Built solo in 48 hours for the **Hack2Skills × Google Hackathon 2025**.

---

*ElectIQ — Every vote starts with understanding.*
```
</action>
<acceptance_criteria>
- `README.md` contains feature table with Google Service column
- `README.md` contains architecture ASCII diagram
- `README.md` contains Quick Start section with both Docker and manual setup instructions
- `README.md` contains security bullet list with ≥6 items
- `README.md` contains WCAG 2.1 AA accessibility section
- `README.md` contains project structure tree
</acceptance_criteria>
</task>

<task id="5.1.2">
<title>Security audit — confirm secrets out of git + smoke test</title>
<type>execute</type>
<read_first>
- .gitignore
- .env.example
- docker-compose.yml
- backend/main.py
</read_first>
<action>
Run these verification commands:

**1. Confirm no secrets in git history:**
```bash
git log --all --full-history -- .env
# Must return empty (no .env commits)

git grep -r "SUPABASE_SERVICE_ROLE_KEY" -- "*.py" "*.ts" "*.tsx" "*.json" | grep -v ".env.example" | grep -v "tests/"
# Must return empty (no hardcoded keys)
```

**2. Confirm .env is gitignored:**
```bash
git check-ignore -v .env
# Must output: .gitignore:1:.env
```

**3. Confirm credentials/ is gitignored:**
```bash
git check-ignore -v credentials/
# Must output: .gitignore:2:credentials/
```

**4. Final docker-compose smoke test:**
```bash
docker-compose build
docker-compose up -d
sleep 10

# Health check
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Timeline
curl http://localhost:8000/api/timeline
# Expected: {"phases": [...]} with 7 items

# Frontend
curl -s http://localhost:5173 | grep -q "ElectIQ"
# Expected: exit 0

docker-compose down
```

**5. Create `SUBMISSION.md`:**
```markdown
# Hack2Skills × Google Hackathon — ElectIQ Submission

## Project Name
ElectIQ — AI-Powered Civic Education Platform

## Google Services Used
1. **Vertex AI (Gemini 1.5 Flash)** — Powers streaming chatbot, quiz question generation, and misinformation fact-checking
2. **Cloud Translation API v3** — Translates UI strings and chatbot bundles into 50+ languages
3. **Google Maps JavaScript API** — Polling booth locator with Places Text Search and Directions

## Demo Instructions
1. `cp .env.example .env` — fill in credentials
2. `docker-compose up`
3. Open http://localhost:5173
4. Try: ask the chatbot, explore the timeline, take the quiz, fact-check a claim

## Architecture Highlights
- Streaming SSE chat (Gemini 1.5 Flash via Vertex AI) — token-by-token response
- RAG pipeline for misinformation buster — 20+ curated KB items + Vertex AI embeddings
- Anonymous Supabase auth — zero sign-up friction; progress persists automatically
- All API keys server-side — React never touches Google Cloud credentials
- WCAG 2.1 AA compliant — keyboard navigable, screen-reader friendly, RTL support

## Repository
[GitHub link]

## Video Demo
[Backup demo video link]
```
</action>
<acceptance_criteria>
- `git check-ignore -v .env` outputs `.gitignore:1:.env`  (or similar path) — not empty
- `git log --all -- .env` returns no commits (no `.env` in git history)
- `curl http://localhost:8000/health` returns `{"status":"ok"}` after `docker-compose up`
- `curl http://localhost:8000/api/timeline` returns JSON with 7 phases
- `SUBMISSION.md` exists with Google Services Used section listing all 3 services
- `SUBMISSION.md` contains Demo Instructions section
</acceptance_criteria>
</task>

</tasks>

<verification>
1. `git log --all -- .env` → empty output (no .env in history)
2. `git grep -r "SUPABASE_SERVICE_ROLE_KEY"` → empty (no hardcoded keys in source)
3. `docker-compose up -d && curl localhost:8000/health` → `{"status":"ok"}`
4. All 7 features accessible from Home page feature cards
5. Chat: send message → streaming response appears
6. Quiz: complete → badge shown, score in Supabase
7. Fact-check: submit claim → verdict returned
8. Maps: search address → polling booths listed
9. Language switch to Hindi → UI strings translate
10. `README.md` renders correctly on GitHub (check markdown formatting)
</verification>

<success_criteria>
- [ ] README complete and renders correctly
- [ ] No secrets in git history or source files
- [ ] `docker-compose up` starts both services cleanly
- [ ] All 7 features work in smoke test
- [ ] SUBMISSION.md complete with all required sections
- [ ] `.env.example` has all required keys documented
</success_criteria>

<must_haves>
- Zero secrets in git — this is a public repo; any leaked key is a security incident
- `docker-compose up` must work from a clean clone with only a `.env` file provided
- README architecture diagram must be accurate to the actual implementation
</must_haves>

## PLANNING COMPLETE
