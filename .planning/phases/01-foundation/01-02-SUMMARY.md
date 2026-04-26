# Plan 01-02: Supabase Schema & Auth — SUMMARY

## Status: ✅ Complete

## What was built
- `supabase/migrations/20240101000000_init.sql` — full schema with 4 tables and RLS policies:
  - `sessions` — uuid PK, alias (auto-generated), lang_code
  - `checklist_items` — FK to sessions, item_id, label, completed boolean, completed_at
  - `quiz_scores` — FK to sessions, score (0–100 constrained), badge, taken_at
  - `fact_check_flags` — FK to sessions (insert-only via RLS), claim + verdict fields
- RLS enabled on all 4 tables with session-scoped policies (`id = auth.uid()`)
- `fact_check_flags` policy: insert-only (users cannot read others' flags)
- `frontend/src/lib/supabase.ts` — singleton Supabase JS client from VITE_ env vars
- `frontend/src/lib/api.ts` — `apiFetch()` helper: auto-attaches Bearer JWT to all API requests
- `frontend/src/hooks/useAuth.ts` — anonymous sign-in on first load, persists in localStorage via Supabase; exposes `{ sessionId, loading }`
- `backend/services/supabase_client.py` — `verify_session()` FastAPI dependency: validates JWT, returns `user_id`

## Acceptance criteria
- [x] Migration SQL has all 4 tables with correct foreign keys
- [x] RLS enabled on all tables
- [x] `sessions` policy: `id = auth.uid()`
- [x] `fact_check_flags` policy: insert-only with `flagged_by = auth.uid()`
- [x] `useAuth` hook signs in anonymously on first mount
- [x] `apiFetch` attaches Authorization header from `supabase.auth.getSession()`
- [x] `verify_session` raises 401 for missing/invalid tokens

## Key files created
- `supabase/migrations/20240101000000_init.sql`
- `frontend/src/lib/supabase.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/hooks/useAuth.ts`
- `backend/services/supabase_client.py` (updated with `verify_session`)
