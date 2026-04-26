---
phase: 2
plan: 2
title: "Multilingual Support + Misinformation Buster RAG"
type: execute
wave: 2
depends_on: ["02-PLAN-timeline-checklist.md"]
autonomous: true
files_modified:
  - backend/routers/translate.py
  - backend/routers/fact_check.py
  - backend/services/rag.py
  - backend/data/misinformation_kb.json
  - backend/main.py
  - frontend/src/i18n/en.json
  - frontend/src/i18n/index.ts
  - frontend/src/components/LanguageSwitcher.tsx
  - frontend/src/pages/FactCheck.tsx
  - frontend/src/App.tsx
requirements:
  - REQ-003
  - REQ-007
  - REQ-008
---

<objective>
Implement Google Translate API integration with language switcher UI, and the Misinformation Buster RAG pipeline (Vertex AI embeddings + Gemini grounded fact-check). Both must work end-to-end.
</objective>

<tasks>

<task id="2.2.1">
<title>Translation backend + language switcher frontend</title>
<type>execute</type>
<read_first>
- backend/main.py
- backend/services/supabase_client.py
- .planning/REQUIREMENTS.md (REQ-003)
</read_first>
<action>
Install in backend: `google-cloud-translate` (already in requirements.txt).

Create `backend/routers/translate.py`:
```python
import os, json, pathlib
from cachetools import TTLCache
from fastapi import APIRouter
from google.cloud import translate_v3

router = APIRouter(prefix="/api/translate", tags=["translate"])
_cache: TTLCache = TTLCache(maxsize=100, ttl=86400)
_client = None

PRIORITY_LANGS = ["en","hi","es","fr","ar","zh","ur","pt","bn","ru"]

def _get_client():
    global _client
    if _client is None:
        _client = translate_v3.TranslationServiceClient()
    return _client

def _get_base_strings() -> dict:
    p = pathlib.Path(__file__).parent.parent / "data" / "i18n_base.json"
    return json.loads(p.read_text())

@router.get("/bundle")
async def get_bundle(lang: str = "en"):
    if lang not in PRIORITY_LANGS:
        lang = "en"
    if lang == "en":
        return _get_base_strings()
    if lang in _cache:
        return _cache[lang]

    base = _get_base_strings()
    project = os.environ["VERTEX_AI_PROJECT"]
    client = _get_client()
    parent = f"projects/{project}/locations/global"

    translated = {}
    for key, val in base.items():
        resp = client.translate_text(
            request={"parent": parent, "contents": [val],
                     "target_language_code": lang, "source_language_code": "en",
                     "mime_type": "text/plain"}
        )
        translated[key] = resp.translations[0].translated_text

    _cache[lang] = translated
    return translated
```

Create `backend/data/i18n_base.json`:
```json
{
  "nav.home": "Home",
  "nav.timeline": "Election Timeline",
  "nav.checklist": "My Checklist",
  "nav.factcheck": "Fact Check",
  "nav.quiz": "Quiz",
  "nav.maps": "Find Polling Booth",
  "home.title": "Your election guide, in your language",
  "home.subtitle": "Understand how to vote, where to vote, and what to believe.",
  "chat.placeholder": "Ask about elections...",
  "chat.open": "Open AI assistant",
  "checklist.title": "Your Voter Checklist",
  "checklist.progress": "complete",
  "timeline.title": "Election Timeline",
  "timeline.subtitle": "Tap a phase to learn what it means for you.",
  "factcheck.title": "Fact Checker",
  "factcheck.placeholder": "Enter a claim you've seen or heard...",
  "factcheck.submit": "Check this claim",
  "quiz.title": "Civic Knowledge Quiz",
  "quiz.start": "Start Quiz"
}
```

Register in `backend/main.py`:
```python
from backend.routers.translate import router as translate_router
app.include_router(translate_router)
```

Install frontend i18n deps (already in package.json). Create `frontend/src/i18n/index.ts`:
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: localStorage.getItem('electiq-lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
```

Create `frontend/src/i18n/en.json` — copy of the i18n_base.json keys above.

Import `i18n` in `frontend/src/main.tsx`: `import '@/i18n'`

Create `frontend/src/components/LanguageSwitcher.tsx`:
```typescript
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code:'en', label:'English' }, { code:'hi', label:'हिन्दी' },
  { code:'es', label:'Español' }, { code:'fr', label:'Français' },
  { code:'ar', label:'العربية' }, { code:'zh', label:'中文' },
  { code:'ur', label:'اردو' },   { code:'pt', label:'Português' },
  { code:'bn', label:'বাংলা' }, { code:'ru', label:'Русский' },
]
const RTL = ['ar','he','ur']

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [loading, setLoading] = useState(false)

  const change = async (code: string) => {
    setLoading(true)
    localStorage.setItem('electiq-lang', code)
    document.documentElement.setAttribute('dir', RTL.includes(code) ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', code)
    if (code !== 'en') {
      try {
        const res = await fetch(`/api/translate/bundle?lang=${code}`)
        const bundle = await res.json()
        i18n.addResourceBundle(code, 'translation', bundle, true, true)
      } catch {}
    }
    await i18n.changeLanguage(code)
    setLoading(false)
  }

  return (
    <select
      value={i18n.language}
      onChange={e => change(e.target.value)}
      disabled={loading}
      aria-label="Select language"
      className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-300"
    >
      {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  )
}
```
</action>
<acceptance_criteria>
- `GET /api/translate/bundle?lang=en` returns JSON with `nav.home`, `nav.timeline`, `chat.placeholder` keys
- `GET /api/translate/bundle?lang=hi` returns translated Hindi strings (or cached)
- `backend/routers/translate.py` contains `TTLCache(maxsize=100, ttl=86400)`
- `frontend/src/components/LanguageSwitcher.tsx` sets `document.documentElement.setAttribute('dir', 'rtl')` for `ar`, `he`, `ur`
- Language switcher renders in UI; changing to Hindi updates UI strings via i18next
- `frontend/src/i18n/en.json` exists with all keys matching `i18n_base.json`
</acceptance_criteria>
</task>

<task id="2.2.2">
<title>Misinformation Buster — RAG backend + fact-check UI</title>
<type>execute</type>
<read_first>
- backend/services/vertex.py
- backend/services/sanitise.py
- backend/services/supabase_client.py
- .planning/REQUIREMENTS.md (REQ-007)
</read_first>
<action>
Install: `pip install numpy` (add to requirements.txt).

Create `backend/data/misinformation_kb.json` with 20+ entries:
```json
[
  {"claim": "You need a passport to vote", "verdict": "FALSE", "explanation": "In most democracies, a government-issued photo ID such as a driver's licence or national ID card is sufficient. A passport is one of several accepted forms of ID.", "sources": ["Electoral Commission Guidelines"]},
  {"claim": "Voting is not compulsory", "verdict": "CONTEXT-DEPENDENT", "explanation": "Compulsory voting varies by country. Australia has mandatory voting with fines for non-compliance. Most countries treat voting as a right, not an obligation.", "sources": ["IDEA Global Compulsory Voting Database"]},
  {"claim": "You can vote multiple times by going to different booths", "verdict": "FALSE", "explanation": "Electoral rolls are marked and cross-checked in real time. Attempting to vote more than once is electoral fraud and a criminal offence.", "sources": ["Electoral Integrity Commission"]},
  {"claim": "Online voting is available everywhere", "verdict": "FALSE", "explanation": "Only a handful of countries (e.g. Estonia) have national online voting. Most democracies require in-person attendance or postal voting.", "sources": ["IFES Election Guide"]},
  {"claim": "Postal votes are not counted", "verdict": "FALSE", "explanation": "Postal votes are legally valid and counted alongside in-person votes, though counting may occur after election day in some jurisdictions.", "sources": ["Electoral Commission"]},
  {"claim": "If you spoil your ballot it gets counted as a vote for the incumbent", "verdict": "FALSE", "explanation": "Spoilt ballots are recorded as informal votes and do not count toward any candidate. They are separately tallied and reported.", "sources": ["Electoral Commission"]},
  {"claim": "You can take photos of your ballot", "verdict": "CONTEXT-DEPENDENT", "explanation": "Laws vary by jurisdiction. In many countries photographing your completed ballot is prohibited to prevent vote-selling. Check your local electoral authority.", "sources": ["Electoral Commission"]},
  {"claim": "Candidates can watch the vote counting", "verdict": "TRUE", "explanation": "Accredited scrutineers representing candidates and parties are legally permitted to observe the counting process.", "sources": ["Electoral Act"]},
  {"claim": "Election results are decided before counting finishes", "verdict": "FALSE", "explanation": "Preliminary results are projections based on counted votes. Official results are only certified after all votes including postal and overseas votes are counted.", "sources": ["Electoral Commission"]},
  {"claim": "Only citizens can vote", "verdict": "CONTEXT-DEPENDENT", "explanation": "In most countries, only citizens can vote in national elections. Some countries allow permanent residents to vote in local elections.", "sources": ["IDEA Voter Eligibility Database"]},
  {"claim": "You can be paid to vote for a particular candidate", "verdict": "FALSE", "explanation": "Vote-buying is illegal in all democracies and constitutes electoral fraud. Both the buyer and seller can face criminal prosecution.", "sources": ["Electoral Integrity Commission"]},
  {"claim": "Your vote is not secret", "verdict": "FALSE", "explanation": "The secret ballot is a cornerstone of democratic elections. Ballot papers are not linked to voter identities after being cast.", "sources": ["Universal Declaration of Human Rights"]},
  {"claim": "If you don't vote nothing bad happens", "verdict": "MISLEADING", "explanation": "In countries with compulsory voting, not voting results in fines. In others, not voting means your voice is not represented, which can affect election outcomes.", "sources": ["Electoral Commission"]},
  {"claim": "The media declares the winner before all votes are counted", "verdict": "MISLEADING", "explanation": "Media organisations make projections based on counted votes and exit polls, but only the official electoral authority can legally declare a winner.", "sources": ["Media Standards Authority"]},
  {"claim": "Election officials can change your vote", "verdict": "FALSE", "explanation": "Physical ballots are secured and counted by multiple officials under scrutiny from all parties. Electronic systems have audit trails. Tampering is a serious crime.", "sources": ["Electoral Commission"]},
  {"claim": "You must vote for every position on the ballot", "verdict": "CONTEXT-DEPENDENT", "explanation": "Requirements vary by jurisdiction and ballot type. Some require preferences for all candidates (full preferential); others allow partial voting (optional preferential).", "sources": ["Electoral Act"]},
  {"claim": "Social media polls predict election results accurately", "verdict": "FALSE", "explanation": "Social media polls have significant self-selection bias and are not representative of the voting population. They are not reliable predictors of election outcomes.", "sources": ["American Association for Public Opinion Research"]},
  {"claim": "Overseas voters cannot vote", "verdict": "FALSE", "explanation": "Most democracies provide mechanisms for citizens living abroad to vote, including postal voting, proxy voting, or in-person voting at embassies.", "sources": ["IDEA Overseas Voting Database"]},
  {"claim": "All votes carry equal weight", "verdict": "CONTEXT-DEPENDENT", "explanation": "In first-past-the-post systems, votes in safe seats carry less practical weight. Proportional representation systems aim for more equal weighting. Electoral systems vary.", "sources": ["Electoral System Design, IDEA"]},
  {"claim": "You need to register to vote every election", "verdict": "CONTEXT-DEPENDENT", "explanation": "In many countries, automatic or permanent registration means you only register once. In others, annual registration is required. Check your local electoral authority.", "sources": ["IFES Election Guide"]}
]
```

Create `backend/services/rag.py`:
```python
import json, hashlib, pathlib, numpy as np
from cachetools import TTLCache
from google.cloud import aiplatform
import vertexai
from vertexai.language_models import TextEmbeddingModel
import os

_cache: TTLCache = TTLCache(maxsize=500, ttl=3600)
_kb: list = []
_embeddings: list = []

def _cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

def init_rag():
    """Call once at startup — embeds all KB items."""
    global _kb, _embeddings
    p = pathlib.Path(__file__).parent.parent / "data" / "misinformation_kb.json"
    _kb = json.loads(p.read_text())
    vertexai.init(project=os.environ["VERTEX_AI_PROJECT"],
                  location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"))
    model = TextEmbeddingModel.from_pretrained("textembedding-gecko@003")
    print(f"[RAG] Embedding {len(_kb)} KB items...")
    texts = [item["claim"] for item in _kb]
    result = model.get_embeddings(texts)
    _embeddings = [r.values for r in result]
    print("[RAG] KB embeddings ready.")

def get_top_k(claim: str, k: int = 3) -> list:
    """Embed claim, return top-k KB items by cosine similarity."""
    vertexai.init(project=os.environ["VERTEX_AI_PROJECT"],
                  location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"))
    model = TextEmbeddingModel.from_pretrained("textembedding-gecko@003")
    q_emb = model.get_embeddings([claim])[0].values
    scores = [(_cosine(q_emb, e), i) for i, e in enumerate(_embeddings)]
    scores.sort(reverse=True)
    return [_kb[i] for _, i in scores[:k]]

def cache_key(claim: str) -> str:
    return hashlib.sha256(claim.encode()).hexdigest()
```

Register startup in `backend/main.py`:
```python
from backend.services.rag import init_rag
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    init_rag()
    yield

app = FastAPI(title="ElectIQ API", version="1.0.0", lifespan=lifespan)
```

Create `backend/routers/fact_check.py`:
```python
import json
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from ..services.rag import get_top_k, cache_key, _cache
from ..services.vertex import get_model
from ..services.sanitise import sanitise
from ..services.supabase_client import verify_session, get_supabase

router = APIRouter(prefix="/api/fact-check", tags=["fact-check"])
limiter = Limiter(key_func=get_remote_address)

class ClaimRequest(BaseModel):
    claim: str

class FlagRequest(BaseModel):
    claim: str
    verdict_returned: str

FACT_CHECK_PROMPT = """You are a non-partisan election fact-checker.
Given the following verified election facts as context, evaluate the user's claim.
Return ONLY valid JSON with this exact structure:
{"verdict": "TRUE|FALSE|MISLEADING|CONTEXT-DEPENDENT", "explanation": "2-3 sentences", "sources": ["source1"]}

Context facts:
{context}

User claim: {claim}"""

@router.post("")
@limiter.limit("20/minute")
async def fact_check(request: Request, body: ClaimRequest, session_id: str = Depends(verify_session)):
    clean = sanitise(body.claim, max_len=500)
    ck = cache_key(clean)
    if ck in _cache:
        return {**_cache[ck], "cached": True}

    top_k = get_top_k(clean)
    context = "\n".join([f"- Claim: {i['claim']} | Verdict: {i['verdict']} | {i['explanation']}" for i in top_k])
    prompt = FACT_CHECK_PROMPT.format(context=context, claim=clean)

    model = get_model()
    from vertexai.generative_models import Content, Part
    response = await model.generate_content_async(
        [Content(role="user", parts=[Part.from_text(prompt)])],
        generation_config={"response_mime_type": "application/json"}
    )
    try:
        result = json.loads(response.text)
    except Exception:
        result = {"verdict": "CONTEXT-DEPENDENT", "explanation": response.text[:300], "sources": []}

    _cache[ck] = result
    return {**result, "cached": False}

@router.post("/flag")
async def flag_result(body: FlagRequest, session_id: str = Depends(verify_session)):
    get_supabase().table("fact_check_flags").insert({
        "claim": body.claim[:500],
        "verdict_returned": body.verdict_returned,
        "flagged_by": session_id,
    }).execute()
    return {"status": "flagged"}
```

Register: `from backend.routers.fact_check import router as fact_check_router` + `app.include_router(fact_check_router)`.

Create `frontend/src/pages/FactCheck.tsx`:
```typescript
import { useState } from 'react'
import { apiFetch } from '@/lib/api'

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  TRUE:               { bg: 'bg-green-50 border-green-300',  text: 'text-green-700',  label: '✅ TRUE' },
  FALSE:              { bg: 'bg-red-50 border-red-300',    text: 'text-red-700',    label: '❌ FALSE' },
  MISLEADING:         { bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', label: '⚠️ MISLEADING' },
  'CONTEXT-DEPENDENT':{ bg: 'bg-blue-50 border-blue-300',   text: 'text-blue-700',   label: 'ℹ️ CONTEXT-DEPENDENT' },
}

export function FactCheck() {
  const [claim, setClaim] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const check = async () => {
    if (!claim.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await apiFetch('/api/fact-check', { method: 'POST', body: JSON.stringify({ claim }) })
      if (!r.ok) throw new Error('Check failed')
      setResult(await r.json())
    } catch { setError('Could not check this claim. Please try again.') }
    finally { setLoading(false) }
  }

  const style = result ? VERDICT_STYLES[result.verdict] ?? VERDICT_STYLES['CONTEXT-DEPENDENT'] : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Election Fact Checker</h1>
      <p className="text-gray-600 mb-6">Submit a claim you've seen or heard — we'll check it.</p>
      <div className="flex gap-2 mb-4">
        <input value={claim} onChange={e => setClaim(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="e.g. You need a passport to vote"
          aria-label="Enter a claim to fact-check"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
        <button onClick={check} disabled={loading || !claim.trim()}
          className="px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-40"
          style={{ background: '#1a4e8a' }}>
          {loading ? '...' : 'Check'}
        </button>
      </div>
      {error && <p role="alert" className="text-red-600 text-sm mb-4">{error}</p>}
      {result && style && (
        <div className={`border rounded-2xl p-5 ${style.bg}`}>
          <p className={`font-bold text-lg mb-2 ${style.text}`}>{style.label}</p>
          <p className="text-gray-800 text-sm leading-relaxed mb-3">{result.explanation}</p>
          {result.sources?.length > 0 && (
            <div className="text-xs text-gray-500">
              Sources: {result.sources.join(' · ')}
            </div>
          )}
          <button onClick={() => apiFetch('/api/fact-check/flag', { method:'POST',
            body: JSON.stringify({ claim, verdict_returned: result.verdict }) })}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">
            Flag this result as incorrect
          </button>
        </div>
      )}
    </div>
  )
}
```

Add route in `App.tsx`: `<Route path="/fact-check" element={<FactCheck />} />`
</action>
<acceptance_criteria>
- `backend/data/misinformation_kb.json` contains ≥20 items each with `claim`, `verdict`, `explanation`, `sources` fields
- `backend/services/rag.py` contains `_cosine()` using `np.dot(a,b)/(np.linalg.norm...)`
- `backend/services/rag.py` `init_rag()` called at app lifespan startup
- `backend/routers/fact_check.py` contains `TTLCache` usage via `_cache[ck]` for identical claims
- `backend/routers/fact_check.py` calls `sanitise(body.claim, max_len=500)` before Vertex AI
- `POST /api/fact-check` returns `{"verdict": ..., "explanation": ..., "sources": [...], "cached": bool}`
- `POST /api/fact-check/flag` inserts into `fact_check_flags` table
- Frontend `/fact-check` renders verdict card with colour-coded badge (green=TRUE, red=FALSE, yellow=MISLEADING, blue=CONTEXT-DEPENDENT)
- `LanguageSwitcher` component visible in app header; changing language re-renders UI strings
</acceptance_criteria>
</task>

</tasks>

<verification>
1. `GET /api/translate/bundle?lang=hi` returns Hindi strings (not English)
2. Language switcher: select Arabic → `document.documentElement.dir === "rtl"` (confirm in DevTools)
3. `POST /api/fact-check` with `{"claim": "You need a passport to vote"}` → `{"verdict": "FALSE", ...}`
4. Same claim sent twice → second response has `"cached": true`
5. `POST /api/fact-check/flag` → Supabase `fact_check_flags` table has new row
6. Backend startup logs: `[RAG] Embedding 20 KB items...` then `[RAG] KB embeddings ready.`
7. Frontend `/fact-check`: submit claim → verdict card appears with correct colour badge
</verification>

<success_criteria>
- [ ] Translation bundle endpoint returns translated JSON for all 10 priority languages
- [ ] RTL layout applied for Arabic/Urdu
- [ ] Misinformation buster returns structured verdict for any claim
- [ ] Identical claims return cached response (no duplicate Vertex AI calls)
- [ ] User flagging writes to Supabase
- [ ] Fact-check UI has ARIA `role="alert"` on error state
</success_criteria>

<must_haves>
- `init_rag()` MUST run at startup before any `/api/fact-check` request is served
- All user input MUST pass through `sanitise()` before Vertex AI
</must_haves>

## PLANNING COMPLETE
