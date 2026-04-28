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
