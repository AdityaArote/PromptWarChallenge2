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

-- Fact check flags: users can insert flags (write-only)
CREATE POLICY "insert own flags" ON fact_check_flags
  FOR INSERT WITH CHECK (flagged_by = auth.uid());
