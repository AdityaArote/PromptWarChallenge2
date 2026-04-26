---
phase: 3
plan: 1
title: "Maps Locator + Quiz Engine + Badge System"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - backend/routers/quiz.py
  - backend/models/quiz.py
  - backend/data/quiz_questions.json
  - backend/main.py
  - frontend/src/pages/Maps.tsx
  - frontend/src/pages/Quiz.tsx
  - frontend/src/components/quiz/QuizCard.tsx
  - frontend/src/components/quiz/ScoreBoard.tsx
  - frontend/src/App.tsx
  - index.html
requirements:
  - REQ-004
  - REQ-006
  - REQ-009
---

<objective>
Implement the Google Maps polling booth locator and the full quiz engine (Vertex AI question generation, badge system, leaderboard). All features functional end-to-end.
</objective>

<tasks>

<task id="3.1.1">
<title>Google Maps polling booth locator</title>
<type>execute</type>
<read_first>
- frontend/src/App.tsx
- frontend/src/lib/api.ts
- .planning/REQUIREMENTS.md (REQ-004)
</read_first>
<action>
Install: `npm install @vis.gl/react-google-maps` in frontend.

Add Maps API key to `.env.example`:
```
VITE_MAPS_API_KEY=your-maps-js-api-key-restricted-to-localhost
```

Update `index.html` — load Maps JS API in `<head>`:
```html
<script>
  window.__MAPS_KEY__ = '%VITE_MAPS_API_KEY%';
</script>
```

Create `frontend/src/pages/Maps.tsx`:
```typescript
import { useState, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { MapPin, Navigation } from 'lucide-react'

interface BoothResult {
  name: string; address: string; lat: number; lng: number
  distance: string; place_id: string
}

export function Maps() {
  const [results, setResults] = useState<BoothResult[]>([])
  const [center, setCenter] = useState({ lat: -33.8688, lng: 151.2093 }) // Sydney default
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchNearby = useCallback(async (lat: number, lng: number) => {
    setLoading(true); setError('')
    try {
      // Use Places Text Search via backend proxy (key stays server-side)
      const res = await fetch(`/api/maps/search?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      setResults(data.places || [])
      setCenter({ lat, lng })
    } catch { setError('Could not find polling booths. Try a manual address.') }
    finally { setLoading(false) }
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by your browser.'); return }
    navigator.geolocation.getCurrentPosition(
      p => searchNearby(p.coords.latitude, p.coords.longitude),
      () => setError('Location access denied. Enter an address below.')
    )
  }

  const searchAddress = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(query)}`)
      const d = await res.json()
      if (d.lat) await searchNearby(d.lat, d.lng)
      else setError('Address not found. Try a different search.')
    } catch { setError('Geocoding failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Find Your Polling Booth</h1>
      <p className="text-gray-600 mb-6">Use your location or enter an address to find nearby voting centres.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={useMyLocation}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm hover:bg-gray-50"
          aria-label="Use my current location">
          <Navigation size={16} /> Use my location
        </button>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchAddress()}
          placeholder="Or enter suburb / address..."
          aria-label="Enter address to search"
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
        <button onClick={searchAddress} disabled={loading}
          className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-40"
          style={{ background: '#1a4e8a' }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p role="alert" className="text-red-600 text-sm mb-4">{error}</p>}

      <APIProvider apiKey={import.meta.env.VITE_MAPS_API_KEY}>
        <div className="rounded-2xl overflow-hidden border border-gray-200 mb-4" style={{ height: 340 }}>
          <Map
            defaultCenter={center} center={center} defaultZoom={13}
            mapId="electiq-map"
            role="application" aria-label="Map showing polling booth locations"
          >
            {results.map((r, i) => (
              <AdvancedMarker key={r.place_id} position={{ lat: r.lat, lng: r.lng }} title={r.name}>
                <Pin background="#1a4e8a" glyphColor="#fff" borderColor="#0f3060" />
              </AdvancedMarker>
            ))}
          </Map>
        </div>
      </APIProvider>

      {/* List view — primary for screen readers */}
      <div role="list" aria-label="Polling booth results">
        {results.length === 0 && !loading && (
          <p className="text-gray-500 text-sm text-center py-4">Search above to find polling booths near you.</p>
        )}
        {results.map((r, i) => (
          <div key={r.place_id} role="listitem"
            className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-200 mb-2">
            <MapPin size={20} className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.address}</p>
              {r.distance && <p className="text-xs text-gray-400 mt-0.5">{r.distance} away</p>}
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline shrink-0"
              aria-label={`Get directions to ${r.name}`}>
              Directions
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Create `backend/routers/maps.py`:
```python
import os, httpx
from fastapi import APIRouter

router = APIRouter(prefix="/api/maps", tags=["maps"])
MAPS_KEY = lambda: os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")

@router.get("/search")
async def search_booths(lat: float, lng: float):
    """Proxy Places Text Search — keeps API key server-side."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json={"textQuery": "polling station voting centre", "locationBias": {
                "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": 10000.0}}},
            headers={"X-Goog-Api-Key": MAPS_KEY(),
                     "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.id"},
        )
        data = r.json()
        places = []
        for p in data.get("places", [])[:5]:
            loc = p.get("location", {})
            places.append({
                "name": p.get("displayName", {}).get("text", "Polling Centre"),
                "address": p.get("formattedAddress", ""),
                "lat": loc.get("latitude", lat),
                "lng": loc.get("longitude", lng),
                "place_id": p.get("id", ""),
                "distance": "",
            })
        return {"places": places}

@router.get("/geocode")
async def geocode(address: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": MAPS_KEY()},
        )
        results = r.json().get("results", [])
        if not results:
            return {"error": "not found"}
        loc = results[0]["geometry"]["location"]
        return {"lat": loc["lat"], "lng": loc["lng"]}
```

Add `GOOGLE_MAPS_SERVER_KEY=your-server-restricted-key` to `.env.example`.
Register in `backend/main.py`: `from backend.routers.maps import router as maps_router; app.include_router(maps_router)`
Add `<Route path="/maps" element={<Maps />} />` in `App.tsx`.
</action>
<acceptance_criteria>
- `frontend/src/pages/Maps.tsx` contains `role="application"` and `aria-label` on `<Map>`
- `Maps.tsx` has `role="list"` on results list and `role="listitem"` on each booth card
- `Maps.tsx` has `role="alert"` (via `role` attribute on error paragraph)
- "Use my location" button triggers `navigator.geolocation.getCurrentPosition`
- "Directions" link opens `https://www.google.com/maps/dir/...` in new tab
- `backend/routers/maps.py` proxies Places API — `GOOGLE_MAPS_SERVER_KEY` env var used (never exposed to frontend)
- `GET /api/maps/geocode?address=Sydney` returns `{"lat": ..., "lng": ...}`
- `/maps` page accessible via nav; map renders; list view shows 5 results after search
</acceptance_criteria>
</task>

<task id="3.1.2">
<title>Quiz engine (Vertex AI gen + fallback JSON + badges + leaderboard)</title>
<type>execute</type>
<read_first>
- backend/services/vertex.py
- backend/services/supabase_client.py
- backend/services/sanitise.py
- .planning/REQUIREMENTS.md (REQ-006)
</read_first>
<action>
Create `backend/data/quiz_questions.json` (20 fallback questions, show 4 here):
```json
[
  {"question": "What is compulsory in Australian federal elections?", "options": ["Enrolling to vote", "Voting if enrolled", "Both enrolling and voting", "Showing photo ID"], "correct": 2, "explanation": "In Australia, both enrolling and voting are compulsory for eligible citizens."},
  {"question": "Which document is the secret ballot designed to protect?", "options": ["Your identity", "The candidate list", "Polling booth addresses", "Party funding records"], "correct": 0, "explanation": "The secret ballot ensures no one can link your vote to your identity, protecting you from coercion."},
  {"question": "What is a preferential voting system?", "options": ["You vote for multiple parties equally", "You rank candidates in order of preference", "Only first preference votes are counted", "Parties are allocated seats proportionally"], "correct": 1, "explanation": "In preferential voting, you number candidates in order of preference. If no candidate wins outright, lower preferences are redistributed."},
  {"question": "What does a scrutineer do?", "options": ["Counts votes independently", "Observes counting on behalf of candidates", "Verifies voter registration", "Manages polling booths"], "correct": 1, "explanation": "Scrutineers are accredited observers representing candidates or parties who watch the counting process to ensure integrity."}
]
```

Create `backend/models/quiz.py`:
```python
from pydantic import BaseModel

class QuizSubmission(BaseModel):
    answers: list[int]  # index of selected option per question
    questions: list[dict]  # full question objects returned from /generate
```

Create `backend/routers/quiz.py`:
```python
import json, pathlib, random
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..models.quiz import QuizSubmission
from ..services.vertex import get_model
from ..services.supabase_client import verify_session, get_supabase
from vertexai.generative_models import Content, Part

router = APIRouter(prefix="/api/quiz", tags=["quiz"])
limiter = Limiter(key_func=get_remote_address)

BADGES = {90: "🏆 Election Expert", 70: "⭐ Civic Scholar", 50: "📚 Informed Voter", 0: "🌱 Getting Started"}

def _fallback_questions():
    p = pathlib.Path(__file__).parent.parent / "data" / "quiz_questions.json"
    qs = json.loads(p.read_text())
    return random.sample(qs, min(10, len(qs)))

GEN_PROMPT = """Generate 10 multiple-choice quiz questions about democratic elections, voting procedures, and civic participation.
Return ONLY valid JSON array. Each object: {"question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}
Correct index is 0-based. Make questions educational and non-partisan."""

@router.post("/generate")
@limiter.limit("5/minute")
async def generate_questions(request: Request, session_id: str = Depends(verify_session)):
    try:
        model = get_model()
        response = await model.generate_content_async(
            [Content(role="user", parts=[Part.from_text(GEN_PROMPT)])],
            generation_config={"response_mime_type": "application/json"}
        )
        questions = json.loads(response.text)
        if not isinstance(questions, list) or len(questions) < 5:
            raise ValueError("Bad format")
        return {"questions": questions[:10], "source": "ai"}
    except Exception:
        return {"questions": _fallback_questions(), "source": "fallback"}

@router.post("/submit")
async def submit_quiz(body: QuizSubmission, session_id: str = Depends(verify_session)):
    correct = sum(1 for i, q in enumerate(body.questions) if i < len(body.answers) and body.answers[i] == q["correct"])
    score = round(correct / len(body.questions) * 100)
    badge = next(b for threshold, b in sorted(BADGES.items(), reverse=True) if score >= threshold)
    get_supabase().table("quiz_scores").insert({"session_id": session_id, "score": score, "badge": badge}).execute()
    explanations = [{"question": q["question"], "correct_answer": q["options"][q["correct"]],
                     "explanation": q.get("explanation", ""), "user_correct": body.answers[i] == q["correct"] if i < len(body.answers) else False}
                    for i, q in enumerate(body.questions)]
    return {"score": score, "badge": badge, "correct": correct, "total": len(body.questions), "explanations": explanations}

@router.get("/leaderboard")
async def get_leaderboard():
    sb = get_supabase()
    rows = sb.table("quiz_scores").select("score,badge,taken_at,sessions(alias)").order("score", desc=True).limit(10).execute()
    return {"leaderboard": [{"alias": r["sessions"]["alias"], "score": r["score"], "badge": r["badge"], "taken_at": r["taken_at"]} for r in (rows.data or [])]}
```

Register in `backend/main.py`: `from backend.routers.quiz import router as quiz_router; app.include_router(quiz_router)`.

Create `frontend/src/pages/Quiz.tsx`:
```typescript
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { QuizCard } from '@/components/quiz/QuizCard'
import { ScoreBoard } from '@/components/quiz/ScoreBoard'
import { motion } from 'framer-motion'

export function Quiz() {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const start = async () => {
    setLoading(true)
    const r = await apiFetch('/api/quiz/generate', { method: 'POST' })
    const d = await r.json()
    setQuestions(d.questions)
    setAnswers([])
    setCurrent(0)
    setResult(null)
    setLoading(false)
  }

  const answer = (idx: number) => {
    const next = [...answers, idx]
    setAnswers(next)
    if (current + 1 < questions.length) { setCurrent(current + 1) }
    else {
      apiFetch('/api/quiz/submit', { method:'POST', body: JSON.stringify({ answers: next, questions }) })
        .then(r => r.json()).then(setResult)
    }
  }

  if (result) return <ScoreBoard result={result} onRestart={start} />

  if (questions.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Civic Knowledge Quiz</h1>
      <p className="text-gray-600 mb-8">Test your election knowledge with 10 questions.</p>
      <button onClick={start} disabled={loading}
        className="px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-40"
        style={{ background: '#1a4e8a' }}>
        {loading ? 'Loading questions...' : 'Start Quiz'}
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span>Question {current + 1} of {questions.length}</span>
        <div className="h-2 flex-1 mx-4 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(current / questions.length) * 100}%` }} />
        </div>
      </div>
      <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}>
        <QuizCard question={questions[current]} onAnswer={answer} />
      </motion.div>
    </div>
  )
}
```

Create `frontend/src/components/quiz/QuizCard.tsx`:
```typescript
import { useState } from 'react'
import { motion } from 'framer-motion'

export function QuizCard({ question, onAnswer }: { question: any; onAnswer: (i: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null)

  const pick = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    setTimeout(() => onAnswer(i), 700)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="font-semibold text-gray-900 mb-5 leading-snug">{question.question}</p>
      <div className="space-y-2" role="radiogroup" aria-label="Answer options">
        {question.options.map((opt: string, i: number) => {
          let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all '
          if (selected === null) cls += 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          else if (i === question.correct) cls += 'border-green-400 bg-green-50 text-green-800'
          else if (i === selected && selected !== question.correct) cls += 'border-red-300 bg-red-50 text-red-700'
          else cls += 'border-gray-200 text-gray-400'
          return (
            <motion.button key={i} role="radio" aria-checked={selected === i}
              whileTap={selected === null ? { scale: 0.98 } : undefined}
              className={cls} onClick={() => pick(i)}>
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
```

Create `frontend/src/components/quiz/ScoreBoard.tsx`:
```typescript
export function ScoreBoard({ result, onRestart }: { result: any; onRestart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      <p className="text-5xl mb-2">{result.badge?.split(' ')[0]}</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{result.score}%</h2>
      <p className="text-gray-600 mb-2">{result.badge?.split(' ').slice(1).join(' ')}</p>
      <p className="text-sm text-gray-500 mb-6">{result.correct} of {result.total} correct</p>
      <button onClick={onRestart}
        className="px-8 py-3 rounded-xl font-semibold text-white"
        style={{ background: '#1a4e8a' }}>Try Again</button>
    </div>
  )
}
```

Add routes in `App.tsx`: `<Route path="/quiz" element={<Quiz />} />` and `<Route path="/maps" element={<Maps />} />`
</action>
<acceptance_criteria>
- `POST /api/quiz/generate` returns `{"questions": [...], "source": "ai"|"fallback"}` — 10 questions
- `POST /api/quiz/submit` returns `{"score": int, "badge": str, "correct": int, "total": int, "explanations": [...]}`
- `GET /api/quiz/leaderboard` returns top 10 with alias and score
- Badge thresholds: ≥90% → "Election Expert", ≥70% → "Civic Scholar", ≥50% → "Informed Voter", else "Getting Started"
- Rate limit on `/api/quiz/generate`: 5/minute (prevents AI cost abuse)
- Quiz score written to Supabase `quiz_scores` table on submit
- Frontend Quiz page: question cards animate in; correct answer highlighted green after selection; incorrect highlighted red
- ScoreBoard shows emoji, percentage, and badge label
- Maps page: "Use my location" triggers geolocation; results list has `role="list"`; directions link opens Google Maps
- `backend/routers/maps.py` uses server-side `GOOGLE_MAPS_SERVER_KEY`, never exposes it to frontend
</acceptance_criteria>
</task>

</tasks>

<verification>
1. `POST /api/quiz/generate` → 10 question objects returned (or fallback JSON if Vertex AI unavailable)
2. Answer all 10 questions → score screen shows badge
3. Supabase `quiz_scores` table has new row after submission
4. `GET /api/quiz/leaderboard` returns ordered list with alias
5. Maps page: click "Use my location" (allow in browser) → map centers on user location, list shows up to 5 booths
6. Manual address search "Sydney NSW" → map updates, list populates
7. All quiz option buttons have `role="radio"` and `aria-checked`
</verification>

<success_criteria>
- [ ] Quiz generates 10 questions via Vertex AI (static fallback if AI fails)
- [ ] Score calculated accurately; badge assigned by threshold
- [ ] Score persisted to Supabase
- [ ] Leaderboard returns top 10 with anonymous aliases
- [ ] Maps: geolocation + manual address search both functional
- [ ] Google Maps API key never exposed in browser network tab (proxy pattern)
</success_criteria>

<must_haves>
- Rate limit on quiz generation (5/min) — AI question gen is expensive
- Static fallback questions — demo must work even if Vertex AI quota exceeded
- Maps key security — `GOOGLE_MAPS_SERVER_KEY` only in backend; frontend uses client-restricted `VITE_MAPS_API_KEY` for map rendering only
</must_haves>

## PLANNING COMPLETE
