-- supabase/migrations/001_init.sql
-- CivicPath database schema

-- Election phases content table
create table public.election_phases (
  id                              uuid primary key default gen_random_uuid(),
  phase_order                     int not null unique,
  title                           text not null,
  description                     text,
  icon                            text,
  deadline_days_before_election   int,
  voter_types                     text[] not null default '{first_time,returning,overseas}',
  created_at                      timestamptz default now()
);

-- RLS: anyone can read phases (public educational content)
alter table public.election_phases enable row level security;
create policy "phases_read_public"
  on public.election_phases for select using (true);

-- Quiz questions
create table public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid references public.election_phases(id) on delete cascade,
  question    text not null,
  options     jsonb not null,
  explanation text not null,
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at  timestamptz default now()
);

alter table public.quiz_questions enable row level security;
create policy "questions_read_public"
  on public.quiz_questions for select using (true);

-- User progress (link phases to auth.users)
create table public.user_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  phase_id     uuid references public.election_phases(id) on delete cascade,
  completed    boolean default false,
  completed_at timestamptz,
  created_at   timestamptz default now(),
  unique (user_id, phase_id)
);

alter table public.user_progress enable row level security;
-- Users can only see/modify their own progress
create policy "progress_select_own"
  on public.user_progress for select using (auth.uid() = user_id);
create policy "progress_insert_own"
  on public.user_progress for insert with check (auth.uid() = user_id);
create policy "progress_update_own"
  on public.user_progress for update using (auth.uid() = user_id);

-- Quiz scores
create table public.quiz_scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  phase_id   uuid references public.election_phases(id) on delete cascade,
  score      int not null default 0,
  total      int not null,
  streak     int not null default 0,
  created_at timestamptz default now()
);

alter table public.quiz_scores enable row level security;
create policy "scores_select_own"
  on public.quiz_scores for select using (auth.uid() = user_id);
create policy "scores_insert_own"
  on public.quiz_scores for insert with check (auth.uid() = user_id);

-- AI response cache (SHA-256 key, 24h TTL enforced in Edge Function)
create table public.ai_response_cache (
  cache_key  text primary key,
  answer     text not null,
  created_at timestamptz default now()
);

-- Service role can manage cache (Edge Function uses service role)
alter table public.ai_response_cache enable row level security;
create policy "cache_service_only"
  on public.ai_response_cache for all using (
    (select current_setting('role')) = 'service_role'
  );

-- ── Seed data ──────────────────────────────────────────────────
insert into public.election_phases (phase_order, title, description, icon, deadline_days_before_election, voter_types) values
  (1, 'Voter Registration', 'Ensure your name is on the Electoral Roll. Check the CEO website of your state or use the Voter Helpline 1950 to verify. New voters must fill Form 6; changes use Form 8.', '📋', 90, '{first_time,returning,overseas}'),
  (2, 'Candidate Filing & Nominations', 'Political parties and independent candidates file nomination papers. Review candidate affidavits (assets, criminal records) on the ECI website — this is your right.', '📝', 60, '{first_time,returning}'),
  (3, 'Campaign Period', 'Parties campaign across constituencies. Campaign spending limits apply. The Model Code of Conduct (MCC) kicks in immediately after schedule announcement.', '🎤', 21, '{first_time,returning,overseas}'),
  (4, 'Voting Day', 'Bring your EPIC (Voter ID Card) or any of 12 alternative photo IDs (Aadhaar, passport, PAN, etc.). Polling hours are typically 7 AM to 6 PM. The indelible ink mark on your finger is your proof.', '🗳️', 0, '{first_time,returning}'),
  (5, 'Overseas Postal Ballot', 'NRI voters registered under the Representation of the People Act can apply for a postal ballot 30 days before election. Return it before counting day.', '✉️', 30, '{overseas}'),
  (6, 'Result Declaration & Oath', 'Results are declared within 24-48 hours. Winners take oath in the Legislative Assembly/Parliament. The tenure is 5 years unless dissolved earlier.', '🏆', -3, '{first_time,returning,overseas}');

-- ── Quiz seeds ─────────────────────────────────────────────────
insert into public.quiz_questions (phase_id, question, options, explanation, difficulty)
select
  id,
  'What is the minimum age to vote in India?',
  '[{"text":"16 years","correct":false},{"text":"18 years","correct":true},{"text":"21 years","correct":false},{"text":"25 years","correct":false}]'::jsonb,
  'As per Article 326 of the Indian Constitution, the minimum age to vote is 18 years.',
  'easy'
from public.election_phases where phase_order = 1;

insert into public.quiz_questions (phase_id, question, options, explanation, difficulty)
select
  id,
  'Which form must a new voter fill to register in India?',
  '[{"text":"Form 6","correct":true},{"text":"Form 8","correct":false},{"text":"Form 17A","correct":false},{"text":"Form 7","correct":false}]'::jsonb,
  'Form 6 is used for new voter registration. Form 8 is for corrections, Form 7 for deletion, and Form 17A for challenged votes.',
  'medium'
from public.election_phases where phase_order = 1;

insert into public.quiz_questions (phase_id, question, options, explanation, difficulty)
select
  id,
  'What does the Model Code of Conduct (MCC) govern?',
  '[{"text":"Voter registration process","correct":false},{"text":"Candidate and party behaviour during elections","correct":true},{"text":"Counting of votes","correct":false},{"text":"Polling station setup","correct":false}]'::jsonb,
  'The MCC is a set of guidelines issued by ECI that regulates political parties and candidates from the time of the election schedule announcement to counting day.',
  'medium'
from public.election_phases where phase_order = 3;
