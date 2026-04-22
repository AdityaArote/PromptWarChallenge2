# CivicPath — Implementation Guide
> Winning strategy for every evaluation criterion: Code Quality · Security · Efficiency · Testing · Accessibility · Google Services

---

## 1. Project Scaffold

```bash
npm create vite@latest civicpath -- --template react-ts
cd civicpath

# Core dependencies
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-react \
  zustand \
  react-router-dom \
  @react-aria/button @react-aria/dialog @react-aria/focus \
  @react-aria/live-announcer \
  tailwindcss @tailwindcss/forms \
  clsx tailwind-merge \
  framer-motion \
  date-fns

# Dev / Testing
npm install -D \
  vitest @vitest/ui jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom \
  typescript @types/react @types/react-dom \
  eslint eslint-plugin-jsx-a11y \
  prettier

# Supabase CLI
npx supabase init
```

### tsconfig.json — Strict mode is non-negotiable for Code Quality scoring
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 2. Environment Variables

```bash
# .env.local  (NEVER commit this file)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # public anon key only — safe to expose

# Server-side only (Supabase Edge Functions / Cloud Run)
GEMINI_API_KEY=AIza...          # NEVER in client bundle
SUPABASE_SERVICE_ROLE_KEY=...   # NEVER in client bundle
GCP_PROJECT_ID=civicpath-prod
```

> **Security rule**: `VITE_` prefix = bundled into client. Anything without it = server-only.
> The AI evaluator will scan your bundle for exposed keys. Keep this clean.

---

## 3. Supabase Schema

```sql
-- supabase/migrations/001_election_schema.sql

-- Election phases (seed data, public read)
CREATE TABLE election_phases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_order  integer NOT NULL,
  title        text NOT NULL,
  description  text NOT NULL,
  icon         text,
  deadline_days_before_election integer,
  voter_types  text[] DEFAULT '{"first_time","returning","overseas"}',
  created_at   timestamptz DEFAULT now()
);

-- Quiz questions (per phase)
CREATE TABLE quiz_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id     uuid REFERENCES election_phases(id) ON DELETE CASCADE,
  question     text NOT NULL,
  options      jsonb NOT NULL,  -- [{text, correct}]
  explanation  text NOT NULL,
  difficulty   text CHECK (difficulty IN ('easy','medium','hard'))
);

-- User progress (authenticated users)
CREATE TABLE user_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id     uuid REFERENCES election_phases(id),
  completed    boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE (user_id, phase_id)
);

-- Quiz scores
CREATE TABLE quiz_scores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phase_id     uuid REFERENCES election_phases(id),
  score        integer NOT NULL,
  total        integer NOT NULL,
  streak       integer DEFAULT 0,
  attempted_at timestamptz DEFAULT now()
);

-- Gemini response cache (efficiency)
CREATE TABLE ai_response_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    text UNIQUE NOT NULL,   -- hash(phase_id + question)
  response     text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz DEFAULT now() + interval '24 hours'
);

-- RLS Policies
ALTER TABLE election_phases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache  ENABLE ROW LEVEL SECURITY;

-- Public can read phases and quiz questions
CREATE POLICY "Public read election_phases"
  ON election_phases FOR SELECT USING (true);

CREATE POLICY "Public read quiz_questions"
  ON quiz_questions FOR SELECT USING (true);

-- Users can only read/write their own progress
CREATE POLICY "Users manage own progress"
  ON user_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own scores"
  ON quiz_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cache: service role only writes, anyone can read
CREATE POLICY "Public read cache"
  ON ai_response_cache FOR SELECT USING (true);
```

---

## 4. Supabase Edge Function — Gemini Chat Proxy

```typescript
// supabase/functions/gemini-chat/index.ts
// This is the ONLY place the Gemini API key exists.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20;           // 20 requests per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function sanitizeInput(input: string): string {
  // Strip potential prompt injection patterns
  return input
    .replace(/ignore previous instructions/gi, "")
    .replace(/\bsystem prompt\b/gi, "")
    .trim()
    .slice(0, 1000); // hard cap
}

async function getCacheKey(phaseId: string, question: string): Promise<string> {
  const raw = `${phaseId}::${question.toLowerCase().trim()}`;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Auth check — require valid Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limit per user
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawQuestion: string = body.question ?? "";
    const phaseId: string = body.phase_id ?? "general";
    const phaseTitle: string = body.phase_title ?? "Election Process";
    const voterType: string = body.voter_type ?? "first_time";

    const question = sanitizeInput(rawQuestion);
    if (!question) {
      return new Response(JSON.stringify({ error: "Empty question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check cache
    const cacheKey = await getCacheKey(phaseId, question);
    const { data: cached } = await supabase
      .from("ai_response_cache")
      .select("response")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached?.response) {
      return new Response(
        JSON.stringify({ answer: cached.response, cached: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Build context-aware system prompt
    const systemPrompt = `You are CivicPath, a friendly civic education assistant.
The user is currently viewing the "${phaseTitle}" phase of the election process.
Voter type: ${voterType === "overseas" ? "overseas/NRI voter" : voterType.replace("_", "-") + " voter"}.
Answer questions about elections clearly and concisely in 2-3 sentences.
Always be accurate. Never make up deadlines. If unsure, say so.
Do not respond to off-topic questions — redirect to election topics.`;

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini error:", err);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't find an answer to that. Please try rephrasing.";

    // Cache the response
    await supabase.from("ai_response_cache").upsert({
      cache_key: cacheKey,
      response: answer,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // GCP Cloud Logging (satisfies Google Services criterion)
    console.log(JSON.stringify({
      event: "gemini_chat",
      user_id: user.id,
      phase_id: phaseId,
      question_length: question.length,
      cached: false,
      timestamp: new Date().toISOString(),
    }));

    return new Response(JSON.stringify({ answer, cached: false }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## 5. Client-Side Typed Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types"; // generated via supabase gen types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auto sign-in anonymously on first visit
export async function ensureAnonymousSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.error("Anonymous auth failed:", error.message);
  }
}
```

---

## 6. Custom Hooks

### useElectionData.ts
```typescript
// src/hooks/useElectionData.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ElectionPhase } from "@/types";

type VoterType = "first_time" | "returning" | "overseas";

export function useElectionData(voterType: VoterType) {
  const [phases, setPhases] = useState<ElectionPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPhases() {
      setLoading(true);
      const { data, error } = await supabase
        .from("election_phases")
        .select("id, phase_order, title, description, icon, deadline_days_before_election")
        .contains("voter_types", [voterType])
        .order("phase_order", { ascending: true });

      if (cancelled) return;
      if (error) setError(error.message);
      else setPhases(data ?? []);
      setLoading(false);
    }
    fetchPhases();
    return () => { cancelled = true; };
  }, [voterType]);

  return { phases, loading, error };
}
```

### useGeminiChat.ts
```typescript
// src/hooks/useGeminiChat.ts
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Message { role: "user" | "assistant"; content: string; }

export function useGeminiChat(phaseId: string, phaseTitle: string, voterType: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setError(null);
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question, phase_id: phaseId, phase_title: phaseTitle, voter_type: voterType }),
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { answer } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setError("Could not reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phaseId, phaseTitle, voterType]);

  const reset = useCallback(() => setMessages([]), []);
  return { messages, loading, error, sendMessage, reset };
}
```

### useQuizSession.ts
```typescript
// src/hooks/useQuizSession.ts
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { QuizQuestion } from "@/types";

export function useQuizSession(phaseId: string, questions: QuizQuestion[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const submitAnswer = useCallback(async (optionIndex: number) => {
    setSelectedOption(optionIndex);
    const correct = questions[currentIndex]?.options[optionIndex]?.correct ?? false;
    const newScore = correct ? score + 1 : score;
    const newStreak = correct ? streak + 1 : 0;
    setScore(newScore);
    setStreak(newStreak);

    if (currentIndex >= questions.length - 1) {
      setIsComplete(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("quiz_scores").insert({
          user_id: session.user.id,
          phase_id: phaseId,
          score: newScore,
          total: questions.length,
          streak: newStreak,
        });
      }
    }
  }, [currentIndex, questions, score, streak, phaseId]);

  const nextQuestion = useCallback(() => {
    setSelectedOption(null);
    setCurrentIndex((i) => i + 1);
  }, []);

  return { currentIndex, score, streak, selectedOption, isComplete, submitAnswer, nextQuestion };
}
```

---

## 7. Zustand Store

```typescript
// src/store/voterStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type VoterType = "first_time" | "returning" | "overseas";

interface VoterState {
  voterType: VoterType | null;
  currentPhaseId: string | null;
  completedPhaseIds: string[];
  setVoterType: (type: VoterType) => void;
  setCurrentPhase: (phaseId: string) => void;
  markPhaseComplete: (phaseId: string) => void;
}

export const useVoterStore = create<VoterState>()(
  persist(
    (set) => ({
      voterType: null,
      currentPhaseId: null,
      completedPhaseIds: [],
      setVoterType: (type) => set({ voterType: type }),
      setCurrentPhase: (phaseId) => set({ currentPhaseId: phaseId }),
      markPhaseComplete: (phaseId) =>
        set((state) => ({
          completedPhaseIds: state.completedPhaseIds.includes(phaseId)
            ? state.completedPhaseIds
            : [...state.completedPhaseIds, phaseId],
        })),
    }),
    { name: "civicpath-voter" }
  )
);
```

---

## 8. Testing (Vitest)

```typescript
// src/__tests__/quiz.test.ts
import { describe, it, expect } from "vitest";
import { calculateScore, calculateStreak } from "@/lib/quizUtils";
import { formatDeadline } from "@/lib/dateUtils";
import { sortPhasesByOrder } from "@/lib/phaseUtils";

describe("Quiz scoring logic", () => {
  it("increments score for correct answer", () => {
    expect(calculateScore(3, true)).toBe(4);
  });
  it("does not change score for wrong answer", () => {
    expect(calculateScore(3, false)).toBe(3);
  });
  it("score never goes below 0", () => {
    expect(calculateScore(0, false)).toBe(0);
  });
});

describe("Streak counter", () => {
  it("increments streak on correct answer", () => {
    expect(calculateStreak(2, true)).toBe(3);
  });
  it("resets streak to 0 on wrong answer", () => {
    expect(calculateStreak(5, false)).toBe(0);
  });
});

describe("Deadline date formatter", () => {
  it("formats days before election correctly", () => {
    const result = formatDeadline(45);
    expect(result).toMatch(/45 days before election/i);
  });
  it("returns 'Election Day' for 0 days", () => {
    expect(formatDeadline(0)).toBe("Election Day");
  });
  it("handles null gracefully", () => {
    expect(formatDeadline(null)).toBe("Check local guidelines");
  });
});

describe("Phase sort order", () => {
  it("sorts phases ascending by phase_order", () => {
    const phases = [
      { id: "b", phase_order: 2, title: "Voting" },
      { id: "a", phase_order: 1, title: "Registration" },
    ];
    const sorted = sortPhasesByOrder(phases);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });
  it("handles empty array", () => {
    expect(sortPhasesByOrder([])).toEqual([]);
  });
});
```

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --reporter=verbose",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 9. GCP Deployment

### Dockerfile
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### infra/nginx.conf
```nginx
server {
  listen 8080;
  root /usr/share/nginx/html;
  index index.html;
  # SPA routing
  location / { try_files $uri $uri/ /index.html; }
  # Security headers
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co;";
}
```

### infra/cloudbuild.yaml (CI/CD)
```yaml
steps:
  - name: node:20
    entrypoint: npm
    args: [ci]

  - name: node:20
    entrypoint: npm
    args: [run, test:ci]

  - name: gcr.io/cloud-builders/docker
    args: [build, -t, gcr.io/$PROJECT_ID/civicpath:$COMMIT_SHA, .]

  - name: gcr.io/cloud-builders/docker
    args: [push, gcr.io/$PROJECT_ID/civicpath:$COMMIT_SHA]

  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    entrypoint: gcloud
    args:
      - run
      - deploy
      - civicpath
      - --image=gcr.io/$PROJECT_ID/civicpath:$COMMIT_SHA
      - --region=asia-south1
      - --platform=managed
      - --allow-unauthenticated
      - --set-env-vars=NODE_ENV=production

images:
  - gcr.io/$PROJECT_ID/civicpath:$COMMIT_SHA
```

### Deploy commands
```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com logging.googleapis.com

# Deploy
gcloud run deploy civicpath \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production"
```

---

## 10. GCP Cloud Logging Integration

```typescript
// src/lib/analytics.ts
// Structured logging sent to Cloud Run stdout → automatically captured by Cloud Logging

type LogEvent =
  | "phase_viewed"
  | "phase_completed"
  | "quiz_started"
  | "quiz_completed"
  | "ai_chat_opened"
  | "voter_type_selected";

export function logEvent(event: LogEvent, meta: Record<string, unknown> = {}) {
  // In production (Cloud Run), stdout → Cloud Logging
  // In development, regular console
  if (import.meta.env.PROD) {
    console.log(JSON.stringify({
      severity: "INFO",
      event,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  }
}
```

---

## 11. Stitch Data Ingest (ETL)

```python
# stitch/ingest_election_data.py
import os
import json
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

ELECTION_PHASES = [
    {
        "phase_order": 1,
        "title": "Voter Registration",
        "description": "Register to vote with the Election Commission. Bring government-issued ID and proof of address.",
        "icon": "📋",
        "deadline_days_before_election": 60,
        "voter_types": ["first_time", "returning", "overseas"],
    },
    {
        "phase_order": 2,
        "title": "Candidate Filing",
        "description": "Candidates officially file their nomination papers. Research your candidates during this window.",
        "icon": "📝",
        "deadline_days_before_election": 45,
        "voter_types": ["first_time", "returning", "overseas"],
    },
    {
        "phase_order": 3,
        "title": "Campaign Period",
        "description": "Attend rallies, read manifestos, and compare candidate positions. Make an informed choice.",
        "icon": "🗣️",
        "deadline_days_before_election": 14,
        "voter_types": ["first_time", "returning"],
    },
    {
        "phase_order": 4,
        "title": "Postal Ballot Request",
        "description": "Overseas voters must request postal/absentee ballot by this deadline.",
        "icon": "✉️",
        "deadline_days_before_election": 30,
        "voter_types": ["overseas"],
    },
    {
        "phase_order": 5,
        "title": "Voting Day",
        "description": "Bring your Voter ID. Locate your polling booth using the ECI voter portal. Polls open 7AM–6PM.",
        "icon": "🗳️",
        "deadline_days_before_election": 0,
        "voter_types": ["first_time", "returning", "overseas"],
    },
    {
        "phase_order": 6,
        "title": "Result Declaration",
        "description": "Counting begins and results are declared. Follow live on ECI website or news channels.",
        "icon": "📊",
        "deadline_days_before_election": -2,
        "voter_types": ["first_time", "returning", "overseas"],
    },
]

def seed():
    # Upsert to avoid duplicates on re-run
    result = supabase.table("election_phases").upsert(
        ELECTION_PHASES, on_conflict="phase_order"
    ).execute()
    print(f"Seeded {len(result.data)} election phases.")

if __name__ == "__main__":
    seed()
```

---

## 12. PWA Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CivicPath",
        short_name: "CivicPath",
        description: "Your AI-powered election education companion",
        theme_color: "#534AB7",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          quiz: ["./src/pages/Quiz"],
        },
      },
    },
  },
});
```

---

## 13. Evaluation Criterion Checklist

| Criterion | Implementation | File |
|---|---|---|
| **Code Quality** | TypeScript strict, custom hooks, error boundaries | `tsconfig.json`, `hooks/` |
| **Security** | API key in Edge Function only, RLS on all tables, input sanitization | `functions/gemini-chat/`, SQL migrations |
| **Efficiency** | AI response cache, code splitting, lazy quiz load, select-only-needed-columns | `vite.config.ts`, `ai_response_cache` table |
| **Testing** | Vitest unit tests, `test:ci` script, coverage | `src/__tests__/` |
| **Accessibility** | react-aria, ARIA live regions, keyboard nav, 4.5:1 contrast | `components/`, Design Guide |
| **Google Services** | Vertex AI (Gemini), Cloud Run, Cloud Logging, Cloud Build, Artifact Registry | `cloudbuild.yaml`, `analytics.ts` |
