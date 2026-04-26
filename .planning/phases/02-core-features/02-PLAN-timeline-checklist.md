---
phase: 2
plan: 1
title: "Interactive Election Timeline + Voter Checklist"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - backend/data/election_phases.json
  - backend/routers/timeline.py
  - backend/routers/checklist.py
  - backend/models/checklist.py
  - backend/main.py
  - frontend/src/pages/Timeline.tsx
  - frontend/src/components/timeline/PhaseCard.tsx
  - frontend/src/components/timeline/PhaseDetail.tsx
  - frontend/src/pages/Checklist.tsx
  - frontend/src/components/checklist/ChecklistItem.tsx
  - frontend/src/hooks/useChecklist.ts
  - frontend/src/store/appStore.ts
  - frontend/src/App.tsx
requirements:
  - REQ-002
  - REQ-005
---

<objective>
Build the Interactive Election Timeline with click-to-expand Framer Motion panels, and the Voter Checklist with Supabase persistence and optimistic UI. Both features must be fully functional end-to-end.
</objective>

<tasks>

<task id="2.1.1">
<title>Election timeline JSON + backend endpoint</title>
<type>execute</type>
<read_first>
- backend/main.py
- backend/services/supabase_client.py
- .planning/phases/02-core-features/02-CONTEXT.md (decisions section — timeline JSON schema)
</read_first>
<action>
Create `backend/data/election_phases.json`:
```json
{
  "phases": [
    {
      "id": "announcement",
      "phase_order": 1,
      "title": "Announcement / Writ Drop",
      "description": "The election is officially called. Candidate nomination period opens. This marks the formal start of the electoral process.",
      "duration": "1-3 days",
      "icon": "📢",
      "voter_actions": ["Note the election date", "Check your registration status", "Research candidates and parties"],
      "cta_text": "Check my registration",
      "cta_checklist_item": "check_registration",
      "voter_types": ["first_time", "returning", "overseas"]
    },
    {
      "id": "campaign",
      "phase_order": 2,
      "title": "Campaign Period",
      "description": "Political parties and candidates campaign. Debates, rallies, and media coverage intensify. This is your opportunity to research and decide.",
      "duration": "3-6 weeks",
      "icon": "🗣️",
      "voter_actions": ["Attend debates or watch online", "Read candidate policies", "Fact-check claims you see online"],
      "cta_text": "Learn about candidates",
      "cta_checklist_item": "learn_candidates",
      "voter_types": ["first_time", "returning", "overseas"]
    },
    {
      "id": "registration_deadline",
      "phase_order": 3,
      "title": "Voter Registration Deadline",
      "description": "Last date to register to vote or update your enrolment details. Missing this date means you cannot vote in this election.",
      "duration": "1 day (deadline)",
      "icon": "📋",
      "voter_actions": ["Confirm you are registered", "Update your address if moved", "Help friends and family register"],
      "cta_text": "Verify my registration",
      "cta_checklist_item": "check_registration",
      "voter_types": ["first_time", "returning", "overseas"]
    },
    {
      "id": "pre_poll_silence",
      "phase_order": 4,
      "title": "Pre-Poll Silence Period",
      "description": "Campaign blackout period. No new political advertising or campaigning allowed. Time to make your final decision in peace.",
      "duration": "1-3 days",
      "icon": "🤫",
      "voter_actions": ["Review your voting plan", "Confirm your polling booth location", "Prepare your ID documents"],
      "cta_text": "Confirm my booth",
      "cta_checklist_item": "confirm_booth",
      "voter_types": ["first_time", "returning", "overseas"]
    },
    {
      "id": "voting_day",
      "phase_order": 5,
      "title": "Voting Day",
      "description": "Polling booths are open. Eligible voters cast their ballots. This is the day your voice is heard.",
      "duration": "1 day (typically 7am–8pm)",
      "icon": "🗳️",
      "voter_actions": ["Bring valid photo ID", "Go to your registered polling booth", "Cast your ballot — your vote matters"],
      "cta_text": "Find my polling booth",
      "cta_checklist_item": "confirm_booth",
      "voter_types": ["first_time", "returning", "overseas"]
    },
    {
      "id": "counting",
      "phase_order": 6,
      "title": "Vote Counting",
      "description": "Ballots are counted by trained electoral officials. Preliminary results begin to emerge. The process is transparent and verified.",
      "duration": "1-7 days",
      "icon": "🔢",
      "voter_actions": ["Watch results on official channels", "Be patient — counting takes time", "Avoid sharing unverified results"],
      "cta_text": "Understand how counting works",
      "cta_checklist_item": null,
      "voter_types": ["first_time", "returning", "overseas"]
    },
    {
      "id": "results",
      "phase_order": 7,
      "title": "Official Results & Swearing-In",
      "description": "Results are officially certified. Winning candidates are sworn into office. Democracy is complete — until the next election.",
      "duration": "1-4 weeks post-vote",
      "icon": "🏛️",
      "voter_actions": ["Acknowledge the result", "Engage with your elected representatives", "Stay civically active"],
      "cta_text": "Stay engaged",
      "cta_checklist_item": null,
      "voter_types": ["first_time", "returning", "overseas"]
    }
  ]
}
```

Create `backend/routers/timeline.py`:
```python
import json
import pathlib
from fastapi import APIRouter

router = APIRouter(prefix="/api/timeline", tags=["timeline"])
_DATA = None

def _load():
    global _DATA
    if _DATA is None:
        p = pathlib.Path(__file__).parent.parent / "data" / "election_phases.json"
        _DATA = json.loads(p.read_text())
    return _DATA

@router.get("")
async def get_timeline(voter_type: str = "first_time"):
    data = _load()
    phases = [p for p in data["phases"] if voter_type in p.get("voter_types", [])]
    return {"phases": phases}
```

Register in `backend/main.py`:
```python
from backend.routers.timeline import router as timeline_router
app.include_router(timeline_router)
```
</action>
<acceptance_criteria>
- `backend/data/election_phases.json` contains exactly 7 phase objects, each with `id`, `phase_order`, `title`, `description`, `duration`, `icon`, `voter_actions`, `cta_text`, `cta_checklist_item`, `voter_types` fields
- `GET /api/timeline` returns `{"phases": [...]}` with 7 phases
- `GET /api/timeline?voter_type=first_time` returns all 7 phases
- `backend/routers/timeline.py` contains `router = APIRouter(prefix="/api/timeline")`
- `backend/main.py` contains `app.include_router(timeline_router)`
</acceptance_criteria>
</task>

<task id="2.1.2">
<title>Voter checklist backend (CRUD + seed defaults)</title>
<type>execute</type>
<read_first>
- backend/services/supabase_client.py
- backend/main.py
- .planning/phases/02-core-features/02-CONTEXT.md (decisions — 7 default item_ids)
- .planning/REQUIREMENTS.md (REQ-005)
</read_first>
<action>
Create `backend/models/checklist.py`:
```python
from pydantic import BaseModel
from typing import Optional

class ChecklistItemModel(BaseModel):
    id: str
    session_id: str
    item_id: str
    label: str
    completed: bool
    completed_at: Optional[str] = None

class ToggleRequest(BaseModel):
    completed: bool
```

Create `backend/routers/checklist.py`:
```python
from fastapi import APIRouter, Depends
from ..models.checklist import ToggleRequest
from ..services.supabase_client import get_supabase, verify_session
from datetime import datetime, timezone

router = APIRouter(prefix="/api/checklist", tags=["checklist"])

DEFAULT_ITEMS = [
    {"item_id": "check_registration",  "label": "Check your voter registration status"},
    {"item_id": "confirm_booth",        "label": "Confirm your polling booth location"},
    {"item_id": "prepare_id",          "label": "Prepare a valid photo ID"},
    {"item_id": "arrange_transport",   "label": "Arrange transport to the polling booth"},
    {"item_id": "plan_voting_time",    "label": "Plan what time you will vote"},
    {"item_id": "learn_candidates",    "label": "Learn about the candidates and parties"},
    {"item_id": "understand_ballot",   "label": "Understand how to fill in your ballot"},
]

@router.get("")
async def get_checklist(session_id: str = Depends(verify_session)):
    sb = get_supabase()
    result = sb.table("checklist_items").select("*").eq("session_id", session_id).execute()
    items = result.data or []

    if not items:
        # Seed defaults for new session
        rows = [{"session_id": session_id, **d, "completed": False} for d in DEFAULT_ITEMS]
        sb.table("checklist_items").insert(rows).execute()
        items = sb.table("checklist_items").select("*").eq("session_id", session_id).execute().data

    return {"items": items}

@router.put("/{item_id}")
async def toggle_item(item_id: str, body: ToggleRequest, session_id: str = Depends(verify_session)):
    sb = get_supabase()
    update = {"completed": body.completed}
    if body.completed:
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        update["completed_at"] = None

    sb.table("checklist_items").update(update).eq("session_id", session_id).eq("item_id", item_id).execute()
    return {"status": "ok", "item_id": item_id, "completed": body.completed}
```

Register in `backend/main.py`:
```python
from backend.routers.checklist import router as checklist_router
app.include_router(checklist_router)
```
</action>
<acceptance_criteria>
- `backend/routers/checklist.py` contains `DEFAULT_ITEMS` list with 7 items including `check_registration`, `confirm_booth`, `prepare_id`, `arrange_transport`, `plan_voting_time`, `learn_candidates`, `understand_ballot`
- `GET /api/checklist` (with valid Bearer token) seeds default items if none exist, then returns them
- `PUT /api/checklist/{item_id}` updates `completed` and sets `completed_at` when `completed: true`
- `PUT /api/checklist/{item_id}` sets `completed_at: null` when `completed: false`
- `backend/main.py` contains `app.include_router(checklist_router)`
</acceptance_criteria>
</task>

<task id="2.1.3">
<title>Timeline frontend (PhaseCard + PhaseDetail slide-over)</title>
<type>execute</type>
<read_first>
- frontend/src/App.tsx
- frontend/src/lib/api.ts
- frontend/src/hooks/useAuth.ts
- .planning/REQUIREMENTS.md (REQ-002 — click-to-expand, Framer Motion stagger)
</read_first>
<action>
Create `frontend/src/components/timeline/PhaseCard.tsx`:
```typescript
import { motion } from 'framer-motion'

interface Phase {
  id: string; phase_order: number; title: string; description: string
  duration: string; icon: string; voter_actions: string[]
  cta_text: string; cta_checklist_item: string | null
}

interface Props { phase: Phase; onClick: (phase: Phase) => void; index: number }

export function PhaseCard({ phase, onClick, index }: Props) {
  return (
    <motion.button
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.08 }}
      onClick={() => onClick(phase)}
      className="w-full text-left bg-white rounded-2xl border border-gray-200 p-5
        hover:border-blue-300 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
      aria-label={`Phase ${phase.phase_order}: ${phase.title}`}
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl mt-0.5" aria-hidden="true">{phase.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">Phase {phase.phase_order}</span>
            <span className="text-xs text-gray-400">· {phase.duration}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base mb-1">{phase.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{phase.description}</p>
        </div>
        <span className="text-gray-400 text-lg">›</span>
      </div>
    </motion.button>
  )
}
```

Create `frontend/src/components/timeline/PhaseDetail.tsx`:
```typescript
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle } from 'lucide-react'

interface Phase {
  id: string; phase_order: number; title: string; description: string
  duration: string; icon: string; voter_actions: string[]
  cta_text: string; cta_checklist_item: string | null
}

interface Props {
  phase: Phase | null
  onClose: () => void
  onCtaClick: (item_id: string) => void
}

export function PhaseDetail({ phase, onClose, onCtaClick }: Props) {
  return (
    <AnimatePresence>
      {phase && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-modal="true" aria-label={phase.title}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{phase.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 font-mono">Phase {phase.phase_order} · {phase.duration}</p>
                  <h2 className="font-bold text-gray-900">{phase.title}</h2>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close panel" className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-gray-700 leading-relaxed mb-6">{phase.description}</p>

              <h3 className="font-semibold text-gray-900 mb-3">What should you do?</h3>
              <ul className="space-y-2 mb-6">
                {phase.voter_actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                    {action}
                  </li>
                ))}
              </ul>

              {phase.cta_checklist_item && (
                <button
                  onClick={() => onCtaClick(phase.cta_checklist_item!)}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={{ background: '#1a4e8a' }}
                >
                  {phase.cta_text}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

Create `frontend/src/pages/Timeline.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PhaseCard } from '@/components/timeline/PhaseCard'
import { PhaseDetail } from '@/components/timeline/PhaseDetail'
import { apiFetch } from '@/lib/api'

interface Phase {
  id: string; phase_order: number; title: string; description: string
  duration: string; icon: string; voter_actions: string[]
  cta_text: string; cta_checklist_item: string | null
}

export function Timeline() {
  const [phases, setPhases] = useState<Phase[]>([])
  const [selected, setSelected] = useState<Phase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/timeline').then(r => r.json()).then(d => {
      setPhases(d.phases)
      setLoading(false)
    })
  }, [])

  const handleCta = (itemId: string) => {
    // Navigate to checklist and mark item — simplified for now
    setSelected(null)
    window.location.href = '/checklist'
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Election Timeline</h1>
      <p className="text-gray-600 mb-6">Tap a phase to learn what it means for you.</p>
      <motion.div
        className="space-y-3"
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {phases.map((phase, i) => (
          <PhaseCard key={phase.id} phase={phase} onClick={setSelected} index={i} />
        ))}
      </motion.div>
      <PhaseDetail phase={selected} onClose={() => setSelected(null)} onCtaClick={handleCta} />
    </div>
  )
}
```

Update `frontend/src/App.tsx` to add route:
```typescript
import { Timeline } from '@/pages/Timeline'
// Inside Routes: <Route path="/timeline" element={<Timeline />} />
```
</action>
<acceptance_criteria>
- `frontend/src/components/timeline/PhaseCard.tsx` contains `motion.button` with `variants` using `{opacity: 0, y: 24}` → `{opacity: 1, y: 0}`
- `frontend/src/components/timeline/PhaseDetail.tsx` contains `role="dialog"` and `aria-modal="true"`
- `PhaseDetail.tsx` uses `AnimatePresence` with `initial={{ x: '100%' }}` slide-in animation
- `frontend/src/pages/Timeline.tsx` fetches from `/api/timeline` and shows loading skeleton
- Timeline page accessible at `http://localhost:5173/timeline`
- All 7 phase cards render; clicking a card opens the slide-over detail panel
</acceptance_criteria>
</task>

<task id="2.1.4">
<title>Checklist frontend (ChecklistItem + useChecklist + progress bar)</title>
<type>execute</type>
<read_first>
- frontend/src/lib/api.ts
- frontend/src/hooks/useAuth.ts
- backend/routers/checklist.py (for API shape)
- .planning/REQUIREMENTS.md (REQ-005 — optimistic UI, progress bar)
</read_first>
<action>
Create `frontend/src/hooks/useChecklist.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

export interface ChecklistItem {
  id: string
  item_id: string
  label: string
  completed: boolean
  completed_at: string | null
}

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/checklist').then(r => r.json()).then(d => {
      setItems(d.items || [])
      setLoading(false)
    })
  }, [])

  const toggle = useCallback(async (item_id: string, completed: boolean) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.item_id === item_id ? { ...i, completed } : i))
    try {
      await apiFetch(`/api/checklist/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed }),
      })
    } catch {
      // Revert on failure
      setItems(prev => prev.map(i => i.item_id === item_id ? { ...i, completed: !completed } : i))
    }
  }, [])

  const progress = items.length > 0 ? Math.round(items.filter(i => i.completed).length / items.length * 100) : 0

  return { items, loading, toggle, progress }
}
```

Create `frontend/src/components/checklist/ChecklistItem.tsx`:
```typescript
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { ChecklistItem as Item } from '@/hooks/useChecklist'

interface Props { item: Item; onToggle: (item_id: string, completed: boolean) => void }

export function ChecklistItemComponent({ item, onToggle }: Props) {
  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors cursor-pointer
        ${item.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-blue-200'}`}
      onClick={() => onToggle(item.item_id, !item.completed)}
      role="checkbox"
      aria-checked={item.completed}
      tabIndex={0}
      onKeyDown={(e) => e.key === ' ' && onToggle(item.item_id, !item.completed)}
    >
      <motion.div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
          ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
        animate={item.completed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {item.completed && <Check size={14} color="white" strokeWidth={3} aria-hidden="true" />}
      </motion.div>
      <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
        {item.label}
      </span>
    </motion.div>
  )
}
```

Create `frontend/src/pages/Checklist.tsx`:
```typescript
import { motion } from 'framer-motion'
import { useChecklist } from '@/hooks/useChecklist'
import { ChecklistItemComponent } from '@/components/checklist/ChecklistItem'

export function Checklist() {
  const { items, loading, toggle, progress } = useChecklist()

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Voter Checklist</h1>
      <p className="text-gray-600 mb-6">Complete every step before election day.</p>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{items.filter(i => i.completed).length} of {items.length} complete</span>
          <span className="font-semibold text-gray-900">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="space-y-2" role="group" aria-label="Voter checklist">
        {items.map(item => (
          <ChecklistItemComponent key={item.id} item={item} onToggle={toggle} />
        ))}
      </div>

      {progress === 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-center"
        >
          <p className="text-green-700 font-semibold">🎉 You're election-ready!</p>
        </motion.div>
      )}
    </div>
  )
}
```

Update `frontend/src/App.tsx`:
```typescript
import { Checklist } from '@/pages/Checklist'
// Inside Routes: <Route path="/checklist" element={<Checklist />} />
```
</action>
<acceptance_criteria>
- `frontend/src/hooks/useChecklist.ts` performs optimistic update: `setItems` called before `apiFetch`
- `useChecklist.ts` reverts state on API failure
- `frontend/src/components/checklist/ChecklistItem.tsx` has `role="checkbox"` and `aria-checked={item.completed}`
- `ChecklistItem.tsx` responds to keyboard Space key (`onKeyDown` handler)
- Progress bar uses `motion.div` with `animate={{ width: \`${progress}%\` }}`
- Checklist page accessible at `http://localhost:5173/checklist`
- Toggling an item updates Supabase (verify: Supabase Dashboard shows `completed: true`)
- Completion message renders when `progress === 100`
</acceptance_criteria>
</task>

</tasks>

<verification>
1. `GET /api/timeline` returns 7 phases with all required fields
2. `GET /api/timeline?voter_type=overseas` returns phases (voter_types includes overseas)
3. Frontend `/timeline` — 7 cards animate in with stagger; click card → slide-over opens
4. `GET /api/checklist` with valid Bearer token seeds 7 default items; second call returns same items (no duplication)
5. Supabase Dashboard `checklist_items` table shows rows after first checklist load
6. Toggle checklist item → Supabase `completed` column updates; refresh page → state preserved
7. Progress bar animates smoothly when items toggled
8. All interactive elements reachable by Tab key; Space key toggles checklist items
</verification>

<success_criteria>
- [ ] Timeline: 7 phases load, stagger animation works, slide-over opens/closes
- [ ] Checklist: 7 defaults seeded, toggle persists to Supabase, progress bar accurate
- [ ] All components have ARIA attributes per REQ-009
- [ ] Loading skeletons shown while data fetches (no blank screens)
- [ ] CTA in PhaseDetail navigates to `/checklist`
</success_criteria>

<must_haves>
- Checklist optimistic UI — toggle must feel instant; Supabase write is fire-and-forget
- RLS must prevent cross-session data access — verify with different session tokens
</must_haves>

## PLANNING COMPLETE
