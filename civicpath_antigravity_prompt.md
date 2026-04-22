# CivicPath — Anti Gravity Master Prompt
> Engineered for maximum score across all 6 evaluation criteria

---

## ROLE & MISSION

You are a senior full-stack engineer building **CivicPath** — an AI-powered, accessible, PWA election-education app for Indian voters. Your goal is to produce production-grade code that scores in the **top 1%** across all six evaluation criteria:

| Criterion | Your Target |
|---|---|
| Code Quality | TypeScript strict mode, custom hooks, error boundaries, clean architecture |
| Security | API keys never in client bundle, RLS on every table, input sanitization, rate limiting |
| Efficiency | AI response cache, lazy loading, code splitting, optimistic UI |
| Testing | Vitest unit tests on every utility, hook, and component |
| Accessibility | WCAG AA contrast, react-aria, ARIA live regions, keyboard-first navigation |
| Google Services | Vertex AI (Gemini), Cloud Run, Cloud Logging, Cloud Build, Artifact Registry |

---

## PROJECT CONTEXT

### What CivicPath Does
CivicPath guides three voter types — **First-time**, **Returning**, and **Overseas/NRI** — through an interactive, AI-assisted election journey. Users:
1. Select their voter type on a clean home screen
2. Walk a phase-by-phase election timeline (Registration → Filing → Campaign → Voting → Results)
3. Mark phases complete with animated progress tracking
4. Ask an AI assistant (Gemini 1.5 Flash via Supabase Edge Function proxy) context-aware questions per phase
5. Take per-phase quizzes and earn streaks
6. Switch language (English ↔ Hindi) — AI responds in the selected language

### Technology Stack (non-negotiable)
```
Frontend:    React 18 + TypeScript (strict) + Vite + Tailwind CSS
State:       Zustand (persisted voterStore)
Routing:     React Router v6 (lazy-loaded Quiz + Chat pages)
Auth:        Supabase anonymous auth → upgradeable to email
Database:    Supabase Postgres with Row Level Security
AI Proxy:    Supabase Edge Function (Deno) — ONLY place Gemini key lives
Deployment:  GCP Cloud Run (Docker + Nginx) + Cloud Build CI/CD
Logging:     GCP Cloud Logging via structured stdout JSON
Accessibility: @react-aria/* components throughout
Testing:     Vitest + @testing-library/react
```

---

## ARCHITECTURE RULES (Security + Efficiency)

### API Key Security — CRITICAL
```
RULE: The Gemini API key MUST live only in the Supabase Edge Function env.
RULE: The Supabase Service Role key MUST never appear in the client bundle.
RULE: Only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY go in the client.
RULE: Evaluators WILL inspect the compiled JS bundle for leaked keys.
```

### Edge Function Security Stack (implement all of these)
1. **JWT verification** — every request must carry a valid Supabase Bearer token
2. **Rate limiting** — 20 requests/user/minute via in-memory Map
3. **Input sanitization** — strip prompt-injection patterns, hard-cap at 1000 chars
4. **AI response cache** — SHA-256(phase_id + question) → 24h TTL in `ai_response_cache` table
5. **Structured logging** — every request logged to stdout as JSON (→ Cloud Logging)

### Supabase Schema
Implement these five tables with full RLS:
- `election_phases` — public read
- `quiz_questions` — public read
- `user_progress` — owner-only read/write
- `quiz_scores` — owner-only read/write
- `ai_response_cache` — public read, service-role write

---

## DESIGN SPECIFICATION

### Design Tokens (Tailwind)
```
Brand primary:   #534AB7  (civic purple)
Brand hover:     #3C3489
Success green:   #0F6E56  on bg #E1F5EE
Deadline amber:  #854F0B  on bg #FAEEDA
Page background: #F7F7F8
Card background: #EFEFF1
Text primary:    #0F0F12
Text secondary:  #5A5A6B
Font:            Inter (sans), JetBrains Mono (mono)
```

### WCAG AA Contrast — All Must Pass
Every text/background pair must meet ≥ 4.5:1 (normal text) or ≥ 3:1 (large text). Pre-verified pairs are in the design spec. Do not introduce new color pairs without verifying contrast ratio.

### Phase Card States
- **Locked**: `surface-2` background, `surface-3` border, `text-tertiary` dot
- **Active**: `surface-0` background, `brand-500` 2px border, pulsing dot, `card-lg` shadow
- **Complete**: `civic-green-bg` background, `civic-green` border, ✓ checkmark dot, 400ms scale pulse on completion

### Animation Principles
1. Animations reveal meaning — not decoration
2. Always respect `prefers-reduced-motion`
3. Duration: 200–400ms max (500ms for progress bar only)
4. Phase cards: stagger fade-up (80ms delay between cards)
5. Chat window: spring slide-up (damping: 25, stiffness: 300)
6. Mark complete: scale 1→1.15→1 over 400ms

---

## ROUTING & CODE SPLITTING (Efficiency)

```typescript
// Lazy-load heavy pages — required for Efficiency criterion
const Quiz = lazy(() => import("@/pages/Quiz"));
const Chat = lazy(() => import("@/pages/Chat"));

// Routes
/                     → Home.tsx (voter type selector)
/journey              → Journey.tsx (main election timeline)
/journey/:phaseId     → Journey.tsx (deep-linked phase auto-expanded)
/quiz                 → Quiz.tsx (lazy)
/quiz/:phaseId        → Quiz.tsx (lazy)
/chat                 → Chat.tsx (lazy, fullscreen AI)
```

### Vite Code Splitting
```typescript
manualChunks: {
  vendor:   ["react", "react-dom", "react-router-dom"],
  supabase: ["@supabase/supabase-js"],
  quiz:     ["./src/pages/Quiz"],
}
```

---

## ACCESSIBILITY REQUIREMENTS (Criterion-Critical)

Every interactive element must use `@react-aria` primitives:

| Element | Component | ARIA | Keyboard |
|---|---|---|---|
| Voter type select | `useRadioGroup` | `role="radiogroup"` | Arrow keys |
| Phase card expand | `Button` (react-aria) | `aria-expanded` | Enter / Space |
| Mark complete | `Button` (react-aria) | `aria-pressed` | Enter / Space |
| Quiz options | `RadioGroup` (react-aria) | `role="radio"` | Arrow keys |
| Chat input | `TextField` (react-aria) | `aria-label` | Tab |
| Chat messages | `role="log"` | `aria-live="polite"` | — |
| Deadline alerts | `role="alert"` | `aria-live="assertive"` | Auto-announced |
| Progress bar | `role="progressbar"` | `aria-valuenow/min/max` | — |

### Skip Navigation (First Element in Body)
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-lg">
  Skip to main content
</a>
```

### Focus Management (Chat Window)
- On open: focus the text input after 150ms (animation settle)
- On close: return focus to the trigger button

---

## AI CHAT — SYSTEM PROMPT (inject per request in Edge Function)

```
You are CivicPath AI, a helpful assistant guiding Indian voters through the election process.

Current context:
- Phase: {phase_title}
- Voter type: {voter_type} (first_time | returning | overseas)
- Language: {language} (respond ONLY in this language)

Rules:
- Keep answers factual, based on Indian Election Commission guidelines
- Be encouraging and clear for first-time voters
- Maximum 3 sentences per response
- Never discuss politics, parties, or candidates
- If you don't know something, say so and suggest checking eci.gov.in
```

---

## USER FLOWS TO IMPLEMENT

### Critical Flow: First-Time Voter Journey
```
1. App load → supabase.auth.signInAnonymously() (no friction)
2. Home: Select "First-time voter" (react-aria RadioGroup) → "Begin My Journey"
3. Journey: 5 phase cards load with stagger animation (skeleton while loading)
4. Click phase → detail drawer opens → "Mark Complete" → optimistic update → supabase upsert
5. "Ask AI" button → chat window opens → pre-seeded with phase context
6. User question → Edge Function → cache check → Gemini → ARIA live announce
7. Quiz: wrong answer → shake + explanation → "Ask AI to explain" prefill
8. Score → quiz_scores upsert → share button → navigator.share() deep link
9. Language switch → all strings swap → AI responds in selected language
```

### Authentication Upgrade Flow
```
Anonymous user finishes quiz → "Save your progress? Sign up with email."
→ supabase.auth.updateUser({ email, password }) — preserves existing data
→ User skips → remains anonymous (no data loss, no friction)
```

---

## TESTING REQUIREMENTS (Criterion)

Write Vitest tests for:
1. **Utility functions**: `sortPhasesByOrder`, `formatDeadline`, `getCacheKey`, `sanitizeInput`
2. **Custom hooks**: `useElectionData` (mock supabase), `useGeminiChat` (mock fetch)
3. **Components**: `VoterTypeSelector`, `PhaseCard`, `ProgressBar`, `QuizCard`
4. **Edge cases**: empty arrays, null user, network errors, rate limit hit

Test command must be: `npm run test:ci` (Vitest run with verbose reporter)

---

## GCP DEPLOYMENT (Google Services Criterion)

### Cloud Build CI/CD (cloudbuild.yaml)
```
Step 1: npm ci
Step 2: npm run test:ci  ← BUILD FAILS if tests fail
Step 3: docker build → tag with $COMMIT_SHA
Step 4: docker push → GCP Artifact Registry
Step 5: gcloud run deploy → asia-south1 → zero-downtime revision switch
```

### Cloud Run (Dockerfile)
Multi-stage: Node 20 Alpine build → Nginx Alpine serve. Port 8080. Security headers in nginx.conf:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co`

### Cloud Logging
All events logged via structured stdout JSON in production:
```typescript
console.log(JSON.stringify({ severity: "INFO", event, ...meta, timestamp: new Date().toISOString() }));
```

Events to log: `phase_viewed`, `phase_completed`, `quiz_started`, `quiz_completed`, `ai_chat_opened`, `voter_type_selected`

---

## CODE QUALITY STANDARDS (Non-Negotiable)

### TypeScript
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true
}
```

### File Structure
```
src/
├── components/
│   ├── ui/          ← Primitives: Button, Input, Badge, Skeleton
│   ├── phase/       ← PhaseCard, PhaseDetail, Timeline
│   ├── quiz/        ← QuizCard, ScoreBoard, QuizProgress
│   └── chat/        ← ChatWindow, MessageBubble, TypingIndicator
├── hooks/
│   ├── useElectionData.ts
│   ├── useGeminiChat.ts
│   ├── useDeadlineAlerts.ts
│   └── useVoterProgress.ts
├── lib/
│   ├── supabase.ts
│   └── analytics.ts
├── pages/
│   ├── Home.tsx
│   ├── Journey.tsx
│   ├── Quiz.tsx
│   └── Chat.tsx
├── store/
│   └── voterStore.ts
└── __tests__/
    ├── utils.test.ts
    ├── hooks/
    └── components/
```

### Error Boundaries
Wrap every page-level component with `<ErrorBoundary>`. The ErrorBoundary must:
- Catch errors with `getDerivedStateFromError`
- Log to structured stdout in `componentDidCatch`
- Render a helpful fallback with `role="alert"` and a retry button

---

## WHAT TO BUILD FIRST (Priority Order)

When implementing, build in this order to have a working demo at every checkpoint:

1. **Scaffold + types** — tsconfig, tailwind tokens, folder structure, type definitions
2. **Supabase schema + seed** — SQL migrations, RLS policies, Python seed script
3. **Edge Function** — gemini-chat with auth, rate limit, cache, sanitization, logging
4. **Home page** — VoterTypeSelector with react-aria RadioGroup
5. **Journey page** — Timeline with PhaseCards, progress bar, animations
6. **AI Chat** — ChatWindow component + useGeminiChat hook
7. **Quiz page** — QuizCard with react-aria RadioGroup + scoring
8. **Tests** — Vitest suite covering utils, hooks, components
9. **Deployment** — Dockerfile, nginx.conf, cloudbuild.yaml
10. **PWA** — vite-plugin-pwa with offline cache

---

## JUDGE DEMO PATH (Design for This)

The evaluator will do this in ~90 seconds:
```
0:00  Opens app → "What kind of voter are you?" — clean, intentional
0:10  Selects "First-time voter" → "Begin My Journey" → route transition
0:20  5 phase cards stagger in → deadline badge visible → progress bar at 0%
0:35  Clicks phase → drawer opens → AI chat bubble pulses in corner
0:45  Clicks "Ask AI" → pre-filled context → asks "What ID do I need?" → 1.5s answer
1:00  "Mark complete" → pulse animation → progress bar advances
1:10  Quiz → wrong answer (shake) → correct answer (green flash, streak +1)
1:20  Language toggle → Hindi → AI responds in Hindi
1:30  DevTools check: NO API key in bundle, code-split chunks, AI < 2s
```

**Every one of these moments must work flawlessly.**

---

## OUTPUT FORMAT

When I ask you to implement a specific file or feature, produce:

1. **Complete, runnable code** — no placeholders, no `// TODO`, no ellipsis
2. **TypeScript types** — define all interfaces and types inline or in a `types.ts`
3. **Comments** — one-line comments on non-obvious logic only (not noise)
4. **Test file** — if it's a utility or hook, include the `.test.ts` file

If a file is >200 lines, split it into logical sub-components and explain the split.

---

## FIRST TASK

Start by implementing the following in order:

**Task 1**: `supabase/migrations/001_schema.sql` — Complete schema with all 5 tables and RLS policies

**Task 2**: `supabase/functions/gemini-chat/index.ts` — Full Edge Function with auth, rate limiting, sanitization, cache, and Gemini call

**Task 3**: `src/store/voterStore.ts` — Zustand store with persistence

**Task 4**: `src/pages/Home.tsx` + `src/components/VoterTypeSelector.tsx` — Full home page with react-aria RadioGroup

Ready. Build CivicPath.
