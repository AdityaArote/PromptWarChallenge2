# ElectIQ — AI-Powered Election Guide

> **Prompt Wars Submission** | Vertical: Civic Education & Democratic Participation

ElectIQ is a multilingual, AI-powered election information assistant that helps first-time and experienced voters understand the electoral process, find their polling booth, fact-check misinformation, and test their civic knowledge — all in one progressive web application.

---

## Chosen Vertical

**Civic Education & Democratic Participation**

Elections are the cornerstone of democracy, yet voter turnout is consistently suppressed by information barriers — people don't know how to register, where to vote, or whether what they've read online is true. ElectIQ directly tackles these barriers through a conversational AI assistant backed by verified data and real-time Google services.

---

## Features

| Feature | Description | Google Service Used |
|---------|-------------|---------------------|
| 💬 **AI Chat** | Streaming election Q&A powered by Gemini 1.5 Flash | Vertex AI (Gemini) |
| 🗓️ **Election Timeline** | Step-by-step electoral lifecycle for first-time and experienced voters | — |
| ✅ **Voter Checklist** | Personalised to-do list persisted per session | Supabase |
| 📍 **Polling Booth Finder** | Map with nearest voting centres based on your location | Google Maps, Places API |
| 🔍 **Fact Checker** | RAG-powered verdict engine with `TRUE/FALSE/MISLEADING/CONTEXT-DEPENDENT` labels | Vertex AI (Gemini + Embeddings) |
| 🌐 **Multilingual UI** | 10 priority languages via Google Cloud Translation | Cloud Translation API v3 |
| 🧠 **Civic Quiz** | AI-generated questions with badge awards and leaderboard | Vertex AI (Gemini) |

---

## Architecture & Approach

```
┌────────────────────────────────────────────────────────────┐
│                      React Frontend                        │
│  TypeScript · Vite · Tailwind · @vis.gl/react-google-maps  │
└──────────────────────┬─────────────────────────────────────┘
                       │ REST + SSE streaming
┌──────────────────────▼─────────────────────────────────────┐
│                  FastAPI Backend                            │
│  Python 3.12 · slowapi rate-limiting · Pydantic v2         │
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  /chat   │ │  /quiz   │ │/fact-check│ │   /maps      │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       │             │            │               │          │
│  ┌────▼─────────────▼────────────▼───┐   ┌──────▼───────┐  │
│  │       Vertex AI (Gemini 1.5 Flash) │   │ Google Maps  │  │
│  │       + text-embedding-004 (RAG)   │   │ Places API   │  │
│  └───────────────────────────────────┘   └──────────────┘  │
│                                                            │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │  Cloud Translation  │  │   Supabase (Auth + Postgres) │  │
│  │  API v3             │  │   RLS enforced per session   │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**RAG Fact-Checker**: Rather than letting Gemini hallucinate election facts, we embed a curated misinformation knowledge base using `text-embedding-004` at startup. Every claim submitted by a user is embedded at query time and the top-3 most similar KB entries are injected as grounding context. Results are SHA-256 keyed and cached for 1 hour to reduce API cost.

**Server-side API Key Proxy**: The Google Maps API key never reaches the browser. All Places and Geocoding calls are proxied through `/api/maps/*`, which validates coordinates server-side before forwarding.

**Streaming Chat**: The `/api/chat/stream` endpoint uses `StreamingResponse` with SSE (Server-Sent Events) so users see tokens as Gemini produces them — no waiting for a full response.

**Per-session Persistence**: Voter checklists and quiz scores are stored in Supabase and linked to the user's anonymous session JWT, allowing progress to survive page refreshes without requiring account creation.

---

## Security

- **Input sanitisation**: All user text is passed through `bleach.clean()` + control-character stripping before reaching any AI model or database.
- **Rate limiting**: `slowapi` enforces per-IP limits on expensive endpoints (chat: 30/min, fact-check: 20/min, quiz generate: 5/min).
- **JWT verification**: Protected routes call Supabase `auth.get_user()` on every request — no custom token parsing.
- **Security headers**: All responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy`.
- **Prompt injection guard**: The Gemini system prompt explicitly instructs the model to ignore embedded override instructions.
- **Coordinate validation**: The `/maps/search` endpoint enforces `lat ∈ [-90, 90]` and `lng ∈ [-180, 180]` via Pydantic/FastAPI query constraints.
- **CORS**: Production origins are configured via `ALLOWED_ORIGINS` environment variable — `localhost` is not whitelisted in production.
- **Secret management**: No API keys or credentials are committed. All secrets are loaded from environment variables (`.env` for local dev, Cloud Run secrets for production).

---

## Efficiency

- **Model singleton**: The Gemini `GenerativeModel` is instantiated once and reused.
- **TTL caches**: Fact-check results are cached for 1 hour; translation bundles for 24 hours; leaderboard queries hit the DB once per request.
- **RAG batch embedding**: All KB items are embedded in a single batch call at startup, not on every request.
- **Context window management**: Chat history is capped at the last 6 turns to avoid token waste.
- **Distance sort**: Polling booth results are sorted by haversine distance server-side.

---

## Testing

```bash
cd backend
pytest tests/ -v --cov=. --cov-report=term-missing
```

Test coverage spans:
- **Health & routing** — `/health`, `/ready`, chat starters, FAQ
- **Sanitisation** — HTML stripping, control chars, Unicode preservation, length limits
- **Maps** — valid responses, coordinate validation (lat/lng bounds), address geocoding
- **Quiz** — AI path, fallback path, scoring logic, answer/question count mismatch
- **Fact-check** — caching, verdict validation
- **Checklist** — auth enforcement, default seeding, toggle
- **Security** — auth required on protected routes, security headers present
- **RAG** — KB loading, cosine similarity, cache key uniqueness

---

## Accessibility

- All interactive elements have `aria-label` attributes.
- `role="alert"` on error messages for screen-reader announcements.
- `role="list"` / `role="listitem"` on search results.
- Map container has `role="application"` and `aria-label`.
- `SkipToContent` component allows keyboard users to skip navigation.
- Focus ring (`focus:ring-2`) on all buttons and inputs.
- Colour contrast meets WCAG AA for all text/background combinations.
- Fully keyboard-navigable (Tab order follows visual flow).

---

## Google Services Integration

| Service | How It's Used |
|---------|---------------|
| **Vertex AI – Gemini 1.5 Flash** | Streaming election chat, quiz question generation, fact-check verdict |
| **Vertex AI – text-embedding-004** | Semantic embedding for RAG fact-checker |
| **Google Maps JavaScript API** | Interactive polling booth map (`@vis.gl/react-google-maps`) |
| **Google Places API (v1 Text Search)** | Finding nearby polling stations by coordinates |
| **Google Geocoding API** | Converting typed addresses to lat/lng |
| **Cloud Translation API v3** | Translating UI strings into 10 languages on-demand |

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- Google Cloud project with Vertex AI, Maps, Translation APIs enabled
- Supabase project

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # fill in VITE_ keys
npm run dev
```

### Docker Compose (full stack)

```bash
docker compose up --build
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (backend only) |
| `VERTEX_AI_PROJECT` | ✅ | GCP project ID |
| `VERTEX_AI_LOCATION` | ✅ | Region (default: `us-central1`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | ✅ | Path to service account JSON |
| `GOOGLE_MAPS_SERVER_KEY` | ✅ | Maps API key (server-side only) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `GEMINI_MODEL` | ❌ | Override model (default: `gemini-1.5-flash`) |

---

## Assumptions

- Users are anonymous (no account required) — sessions are identified by Supabase anonymous auth JWTs.
- The election data (phases, FAQ, misinformation KB, quiz questions) targets a general democratic election context and can be replaced with country-specific data.
- The Google Maps search uses "polling station voting centre" as the text query — results will vary by country.
- Translation is lazy (on first request) and cached for 24 hours to minimise API costs.
- The quiz falls back to a local question bank if Vertex AI is unavailable.

---

## License

MIT — see `LICENSE`.
