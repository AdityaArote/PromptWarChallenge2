# CivicPath — Workflow Guide
> End-to-end flows for every user journey, data pipeline, and system interaction

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser / PWA)                      │
│  React + Vite · TypeScript · Zustand · react-aria · Framer Motion│
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS only
          ┌────────────────────┴────────────────────┐
          │                                          │
          ▼                                          ▼
┌─────────────────┐                      ┌─────────────────────────┐
│  Supabase API   │                      │   GCP Cloud Run          │
│  (Postgres DB)  │◄────────────────────►│   (Static PWA serving)   │
│  Auth · RLS     │                      └─────────────────────────┘
│  Realtime       │                               ▲
└────────┬────────┘                               │ Cloud Logging
         │                                        │ Cloud Build CI
         ▼                                        │
┌─────────────────────┐              ┌────────────────────────────┐
│  Supabase Edge      │              │  GCP Artifact Registry     │
│  Functions          │              │  (Docker images)            │
│  gemini-chat/       │              └────────────────────────────┘
│  deadline-alert/    │
└────────┬────────────┘
         │ Server-side API call only
         ▼
┌─────────────────────┐
│  Google Vertex AI   │
│  Gemini 1.5 Flash   │
│  (API key never     │
│   in client)        │
└─────────────────────┘
```

---

## 2. Complete User Journey — First-Time Voter (Critical Story)

```
STEP 1 → App Load
  Browser → Cloud Run → serves React PWA (cached by service worker)
  React → supabase.auth.getSession()
      └── No session? → signInAnonymously() → creates anon user in auth.users
      └── Session exists? → restore from localStorage

STEP 2 → Home Page (Voter Type Selection)
  User sees: "What kind of voter are you?"
  Options: First-time voter | Returning voter | Overseas voter
  User clicks "First-time voter"
  → voterStore.setVoterType("first_time")
  → logEvent("voter_type_selected", { type: "first_time" })
  → navigate("/journey")

STEP 3 → Journey Page (Core Timeline)
  useElectionData("first_time") fires:
    → supabase.from("election_phases")
         .select("id, phase_order, title, description, icon, deadline_days_before_election")
         .contains("voter_types", ["first_time"])
         .order("phase_order", { ascending: true })
  Loading state → skeleton UI (never blank white screen)
  Success → 5 PhaseCards rendered with stagger animation

STEP 4 → Phase Interaction
  User clicks "Voter Registration" phase card
  → voterStore.setCurrentPhase(phaseId)
  → PhaseDetail drawer/modal opens (framer-motion slide-up)
  → logEvent("phase_viewed", { phase_id, phase_title })
  
  User clicks "Mark Complete"
  → Optimistic UI update (immediate checkmark)
  → supabase.from("user_progress").upsert({ user_id, phase_id, completed: true })
  → Completion animation fires (pulse + checkmark)
  → Progress bar advances

STEP 5 → AI Chat (Context-Aware)
  User sees floating "Ask AI" button
  User clicks it on "Voter Registration" phase
  ChatWindow opens with pre-seeded message:
    "You're on Voter Registration. Deadlines typically fall 60 days before 
     election day. What would you like clarified?"

  User types: "What documents do I need?"
  
  useGeminiChat.sendMessage("What documents do I need?"):
    1. supabase.auth.getSession() → get JWT token
    2. POST /functions/v1/gemini-chat with Bearer token
    3. Edge Function: JWT verify → rate limit check → cache lookup
    4. Cache miss → Gemini API call with system prompt (phase context injected)
    5. Response cached in ai_response_cache
    6. Answer streamed back → ARIA live region announces to screen reader
  
  AI responds in 1-2 seconds
  ARIA live region: "Assistant: You'll need a government-issued photo ID..."

STEP 6 → Quiz
  User navigates to /quiz (lazy-loaded chunk)
  useElectionData fetches quiz_questions for current phase
  QuizCard renders with 4 options (react-aria RadioGroup)
  
  User selects wrong answer:
    → Red highlight with explanation
    → "Ask AI to explain" button → opens chat pre-filled with "Explain: [question]"
    → Streak resets to 0
  
  User selects correct answer:
    → Green highlight + streak animation
    → streak counter increments
  
  Quiz complete:
    → Score saved to quiz_scores via supabase
    → Celebration animation
    → Share button → navigator.share() → deep link to this phase

STEP 7 → Language Switch (Accessibility + Differentiation)
  User clicks language selector → selects Hindi
  → All UI strings switch via i18n key lookup
  → For AI chat: system prompt updated with "Respond in Hindi"
  → Next Gemini call returns Hindi response
```

---

## 3. Data Flow: AI Chat Request (Detailed)

```
CLIENT                          EDGE FUNCTION               SUPABASE DB          GEMINI API
  │                                    │                         │                    │
  ├──POST /functions/v1/gemini-chat────►│                         │                    │
  │  Authorization: Bearer <JWT>        │                         │                    │
  │  Body: { question, phase_id,        │                         │                    │
  │          phase_title, voter_type }  │                         │                    │
  │                                    │                         │                    │
  │                              verify JWT                       │                    │
  │                                    ├──getUser(token)─────────►│                    │
  │                                    │◄────────user────────────┤                    │
  │                                    │                         │                    │
  │                          check rate limit                     │                    │
  │                       (in-memory map, 20 req/min/user)       │                    │
  │                                    │                         │                    │
  │                          sanitize input                       │                    │
  │                       (strip injection patterns, cap 1000)   │                    │
  │                                    │                         │                    │
  │                          compute cache key                    │                    │
  │                       SHA-256(phase_id + question)           │                    │
  │                                    │                         │                    │
  │                                    ├──SELECT ai_response_cache►                   │
  │                                    │  WHERE cache_key = hash  │                    │
  │                                    │  AND expires_at > now()  │                    │
  │                                    │◄──────hit/miss───────────┤                    │
  │                                    │                         │                    │
  │         [CACHE HIT]                │                         │                    │
  │◄───────────────────────────────────┤ { answer, cached: true }│                    │
  │                                    │                         │                    │
  │         [CACHE MISS]               │                         │                    │
  │                                    ├──POST generateContent───────────────────────►│
  │                                    │  model: gemini-1.5-flash│                    │
  │                                    │  system: phase context   │                    │
  │                                    │  user: sanitized question│                    │
  │                                    │◄──────────────────────────────────answer─────┤
  │                                    │                         │                    │
  │                                    ├──UPSERT ai_response_cache►                   │
  │                                    │  TTL: 24 hours           │                    │
  │                                    │                         │                    │
  │                                    ├──console.log(structured JSON)                │
  │                                    │  → GCP Cloud Logging     │                    │
  │◄───────────────────────────────────┤ { answer, cached: false }│                    │
  │                                    │                         │                    │
  ARIA live region announces answer
  to screen reader users
```

---

## 4. Authentication Flow

```
App mounts
    │
    ▼
supabase.auth.getSession()
    │
    ├── Session found? ──► Restore user → proceed to app
    │
    └── No session?
            │
            ▼
        signInAnonymously()
            │
            ├── Success → user.id created → store JWT → proceed
            │
            └── Error → show retry button (network error handling)

Anonymous user completes quiz → wants to save progress permanently:
    │
    ▼
Prompt: "Save your progress? Sign up with email."
    │
    ├── supabase.auth.updateUser({ email, password })
    │   (upgrades anonymous → full account, preserves existing data)
    │
    └── User skips → remains anonymous (no friction, no lost data)
```

---

## 5. State Management Flow (Zustand)

```
voterStore (persisted to localStorage):
  ├── voterType: "first_time" | "returning" | "overseas" | null
  ├── currentPhaseId: string | null
  └── completedPhaseIds: string[]

  Actions:
  ├── setVoterType(type)       → called on Home page selection
  ├── setCurrentPhase(id)      → called when user opens a phase
  └── markPhaseComplete(id)    → called on "Mark complete" click

Derived state (computed in component, not stored):
  ├── progress % = completedPhaseIds.length / phases.length * 100
  └── isPhaseComplete(id) = completedPhaseIds.includes(id)

Server sync:
  ├── On markPhaseComplete → supabase upsert user_progress
  └── On app load → fetch user_progress → hydrate completedPhaseIds
```

---

## 6. Animation Workflow (Framer Motion)

```typescript
// Timeline card entrance — stagger per card
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// Phase completion pulse
const completionVariants = {
  idle: { scale: 1 },
  complete: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.4, ease: "easeInOut" },
  },
};

// Chat window slide-up
const chatVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { y: "100%", opacity: 0 },
};
```

---

## 7. Routing Structure

```
/                     → Home.tsx (voter type selector)
/journey              → Journey.tsx (main election timeline) ← CRITICAL
/journey/:phaseId     → Journey.tsx (deep-linked to specific phase)
/quiz                 → Quiz.tsx (lazy-loaded)
/quiz/:phaseId        → Quiz.tsx (quiz for specific phase)
/chat                 → Chat.tsx (fullscreen AI assistant)
```

```typescript
// src/main.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Journey from "@/pages/Journey";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Lazy-load heavy modules → Efficiency criterion
const Quiz = lazy(() => import("@/pages/Quiz"));
const Chat = lazy(() => import("@/pages/Chat"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner label="Loading..." />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/journey/:phaseId" element={<Journey />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz/:phaseId" element={<Quiz />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## 8. Supabase Realtime — Deadline Alerts

```typescript
// src/hooks/useDeadlineAlerts.ts
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useDeadlineAlerts(onAlert: (message: string) => void) {
  useEffect(() => {
    const channel = supabase
      .channel("deadline-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deadline_alerts" },
        (payload) => {
          const { message } = payload.new as { message: string };
          onAlert(message);
          // ARIA live region will announce this automatically
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [onAlert]);
}
```

---

## 9. Share Flow (Deep Links + OG)

```
User clicks "Share this phase" on "Voter Registration" card
    │
    ▼
navigator.share({
  title: "CivicPath — Voter Registration",
  text: "Learn about voter registration deadlines and requirements",
  url: `https://civicpath.app/journey/${phaseId}`,
})
    │
    ├── Mobile: native share sheet (WhatsApp, X, etc.)
    └── Desktop: fallback → copy link to clipboard

When recipient opens the deep link:
    ├── /journey/uuid-of-voter-reg-phase
    ├── Journey page loads with that phase auto-expanded
    └── useParams("phaseId") → voterStore.setCurrentPhase(phaseId)
```

---

## 10. CI/CD Pipeline Workflow

```
Developer pushes to main branch
    │
    ▼
GitHub webhook → Cloud Build trigger
    │
    ├── Step 1: npm ci (install exact dependencies)
    ├── Step 2: npm run test:ci (Vitest — fails build if tests fail)
    ├── Step 3: docker build → tag with COMMIT_SHA
    ├── Step 4: docker push → GCP Artifact Registry
    └── Step 5: gcloud run deploy → new revision
                 ├── Zero downtime (traffic switches after health check)
                 └── Cloud Run logs available immediately in Cloud Logging

On failure at any step → build fails, no deployment, developer notified
```

---

## 11. Error Boundary Strategy

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to Cloud Logging via structured stdout
    console.error(JSON.stringify({
      severity: "ERROR",
      event: "react_error_boundary",
      error: error.message,
      component: info.componentStack?.split("\n")[1]?.trim(),
    }));
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" aria-live="assertive" style={{ padding: 24 }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page. Your progress is saved.</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 12. Complete Component Tree

```
App
├── ErrorBoundary (wraps everything)
├── SkipToContent (accessibility: keyboard users)
├── Header
│   ├── Logo
│   ├── ProgressBar (animated, reflects completedPhaseIds)
│   ├── StreakCounter
│   └── LanguageSwitcher
│
├── Routes
│   ├── Home
│   │   └── VoterTypeSelector (react-aria RadioGroup)
│   │
│   ├── Journey  ← CRITICAL ROUTE
│   │   ├── JourneyHeader (voter type label + progress %)
│   │   ├── InteractiveTimeline (motion.ul with stagger)
│   │   │   └── PhaseCard[] (motion.li, clickable)
│   │   │       ├── PhaseIcon
│   │   │       ├── PhaseTitle + DeadlineBadge
│   │   │       ├── PhaseDescription (expanded on click)
│   │   │       ├── MarkCompleteButton (react-aria Button)
│   │   │       └── QuizEntryButton
│   │   └── FloatingChatButton (react-aria Button, fixed position)
│   │       └── ChatWindow (framer-motion AnimatePresence)
│   │           ├── MessageList (ARIA live="polite")
│   │           │   └── MessageBubble[]
│   │           ├── TypingIndicator (ARIA live="polite")
│   │           └── ChatInput (react-aria TextField)
│   │
│   ├── Quiz (lazy)
│   │   ├── QuizProgress
│   │   ├── QuizCard (react-aria RadioGroup)
│   │   │   ├── QuestionText
│   │   │   ├── OptionList
│   │   │   └── ExplanationPanel (shown after answer)
│   │   └── ScoreBoard (shown on completion)
│   │
│   └── Chat (lazy, fullscreen)
│       └── [Same as ChatWindow but full-page layout]
│
└── DeadlineAlertToast (ARIA live="assertive", for urgent alerts)
```
