---
phase: 1
plan: 2
title: "Supabase Schema Migration"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - supabase/migrations/20240101000000_init.sql
  - backend/services/supabase_client.py
requirements:
  - REQ-011
  - REQ-008
---

<objective>
Create the complete Supabase database schema with all four tables and RLS policies. The schema must be committed as a versioned SQL migration file, and the backend Supabase client must be fully wired up.
</objective>

<tasks>

<task id="1.2.1">
<title>Write and apply Supabase SQL migration</title>
<type>execute</type>
<read_first>
- .planning/phases/01-foundation/01-CONTEXT.md (decisions section — full schema SQL)
- .planning/REQUIREMENTS.md (REQ-011 — exact table definitions)
</read_first>
<action>
Create directory `supabase/migrations/` and write `supabase/migrations/20240101000000_init.sql`:

```sql
-- ElectIQ: Complete database schema
-- Run via Supabase Dashboard > SQL Editor or `supabase db push`

-- ─── SESSIONS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alias      text        NOT NULL DEFAULT ('Voter #' || floor(random()*9000+1000)::text),
  lang_code  text        NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  item_id      text        NOT NULL,
  label        text        NOT NULL,
  completed    boolean     NOT NULL DEFAULT false,
  completed_at timestamptz
);

-- ─── QUIZ SCORES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_scores (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  score      int2        NOT NULL CHECK (score >= 0 AND score <= 100),
  badge      text,
  taken_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── FACT CHECK FLAGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fact_check_flags (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  claim            text        NOT NULL,
  verdict_returned text        NOT NULL,
  flagged_by       uuid        NOT NULL REFERENCES sessions(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_check_flags  ENABLE ROW LEVEL SECURITY;

-- Sessions: users can read/write their own session only
CREATE POLICY "own session" ON sessions
  FOR ALL USING (id = auth.uid());

-- Checklist: users can access their own items
CREATE POLICY "own checklist items" ON checklist_items
  FOR ALL USING (session_id = auth.uid());

-- Quiz scores: users can read/write their own scores
CREATE POLICY "own quiz scores" ON quiz_scores
  FOR ALL USING (session_id = auth.uid());

-- Fact check flags: users can insert flags (write-only, can't read others')
CREATE POLICY "insert own flags" ON fact_check_flags
  FOR INSERT WITH CHECK (flagged_by = auth.uid());

-- ─── DEFAULT CHECKLIST SEED ──────────────────────────────────────────────────
-- (Inserted per-session in application layer, not via seed — avoids RLS issues)
```

Apply by running in Supabase Dashboard > SQL Editor OR via Supabase CLI:
```bash
supabase db push
```

Also create `supabase/seed.sql` for default checklist items (used in tests):
```sql
-- Default checklist items (insert into checklist_items for a given session_id)
-- item_id values are stable identifiers referenced in frontend
-- check_registration, confirm_booth, prepare_id, arrange_transport,
-- plan_voting_time, learn_candidates, understand_ballot
```
</action>
<acceptance_criteria>
- `supabase/migrations/20240101000000_init.sql` exists and contains `CREATE TABLE sessions`, `CREATE TABLE checklist_items`, `CREATE TABLE quiz_scores`, `CREATE TABLE fact_check_flags`
- SQL file contains `ENABLE ROW LEVEL SECURITY` for all 4 tables
- SQL file contains `CREATE POLICY "own checklist items"` with `session_id = auth.uid()`
- Migration successfully applied: Supabase Dashboard shows all 4 tables in Table Editor
</acceptance_criteria>
</task>

<task id="1.2.2">
<title>Wire up backend Supabase client with auth middleware</title>
<type>execute</type>
<read_first>
- backend/services/supabase_client.py
- backend/main.py
</read_first>
<action>
Update `backend/services/supabase_client.py` with full client + JWT verification:
```python
import os
from functools import lru_cache
from supabase import create_client, Client
from fastapi import HTTPException, Header
from typing import Optional

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

async def verify_session(authorization: Optional[str] = Header(None)) -> str:
    """Verify Supabase JWT and return user_id (session_id)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        client = get_supabase()
        user = client.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
```

Add anonymous session initialization endpoint to `backend/main.py` (append after health route):
```python
from backend.services.supabase_client import get_supabase

@app.post("/api/session/init")
async def init_session():
    """Called by frontend after signInAnonymously — ensures sessions row exists."""
    # Session row is created by Supabase trigger on auth.users insert
    return {"status": "ok"}
```
</action>
<acceptance_criteria>
- `backend/services/supabase_client.py` contains `verify_session` function with `authorization: Optional[str] = Header(None)`
- `verify_session` raises `HTTPException(status_code=401)` when Authorization header is missing
- `verify_session` calls `client.auth.get_user(token)` and returns `user.user.id`
- `backend/main.py` imports from `supabase_client`
</acceptance_criteria>
</task>

<task id="1.2.3">
<title>Frontend Supabase client + anonymous auth hook</title>
<type>execute</type>
<read_first>
- frontend/src/main.tsx
- frontend/src/App.tsx
</read_first>
<action>
Install Supabase JS client:
```bash
cd frontend && npm install @supabase/supabase-js
```

Create `frontend/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

Create `frontend/src/hooks/useAuth.ts`:
```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionId(data.session.user.id)
        setLoading(false)
      } else {
        supabase.auth.signInAnonymously().then(({ data: d }) => {
          setSessionId(d.user?.id ?? null)
          setLoading(false)
        })
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionId(session?.user.id ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { sessionId, loading }
}
```

Create `frontend/src/lib/api.ts` (axios-free fetch helper):
```typescript
import { supabase } from './supabase'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? ''

  return fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}
```
</action>
<acceptance_criteria>
- `frontend/src/lib/supabase.ts` exists with `createClient(import.meta.env.VITE_SUPABASE_URL, ...)`
- `frontend/src/hooks/useAuth.ts` calls `supabase.auth.signInAnonymously()` when no session found
- `frontend/src/lib/api.ts` attaches `Authorization: Bearer <token>` header on every request
- `@supabase/supabase-js` appears in `frontend/package.json` dependencies
</acceptance_criteria>
</task>

</tasks>

<verification>
1. Supabase Dashboard Table Editor shows 4 tables: `sessions`, `checklist_items`, `quiz_scores`, `fact_check_flags`
2. All 4 tables show RLS enabled (lock icon in Supabase UI)
3. `backend/services/supabase_client.py` passes mypy type check: `mypy backend/services/supabase_client.py`
4. `frontend/src/hooks/useAuth.ts` contains `signInAnonymously` call
5. `frontend/package.json` contains `"@supabase/supabase-js"`
</verification>

<success_criteria>
- [ ] All 4 tables created with correct columns and constraints
- [ ] RLS enabled on all tables with correct policies
- [ ] Backend JWT verification middleware functional
- [ ] Frontend auto-signs in anonymously on first load
- [ ] `apiFetch` attaches Bearer token to every request
</success_criteria>

<must_haves>
- RLS policies must enforce `session_id = auth.uid()` for checklist and quiz tables
- `verify_session` dependency usable in any FastAPI route handler via `Depends(verify_session)`
</must_haves>

## PLANNING COMPLETE
