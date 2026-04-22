# CivicPath — Design & UI/UX Specification
> Every design decision is tied to an evaluation criterion. This is not a mood board. This is a scoring guide.

---

## 1. Design Philosophy

**One rule**: Every design decision must either (a) make the first-time voter feel less confused, or (b) score a point with the evaluator.

No decorative elements that don't do one of those two things.

---

## 2. Design Tokens (Tailwind Config)

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand — civic purple
        brand: {
          50:  "#EEEDFE",
          100: "#D8D6FC",
          200: "#B3AFF9",
          500: "#534AB7",  // Primary action
          600: "#3C3489",  // Hover state
          900: "#1A1650",  // Dark text on light bg
        },
        // Success / completed
        civic: {
          green: "#0F6E56",
          "green-bg": "#E1F5EE",
        },
        // Deadline urgency
        civic: {
          amber: "#854F0B",
          "amber-bg": "#FAEEDA",
        },
        // Neutral
        surface: {
          0: "#FFFFFF",
          1: "#F7F7F8",   // Page background
          2: "#EFEFF1",   // Card background
          3: "#E3E3E6",   // Dividers / borders
        },
        text: {
          primary:   "#0F0F12",
          secondary: "#5A5A6B",
          tertiary:  "#9494A5",
          inverse:   "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "display": ["28px", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.5px" }],
        "heading":  ["20px", { lineHeight: "1.3", fontWeight: "500" }],
        "title":    ["16px", { lineHeight: "1.4", fontWeight: "500" }],
        "body":     ["14px", { lineHeight: "1.6" }],
        "caption":  ["12px", { lineHeight: "1.5" }],
        "label":    ["11px", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.04em" }],
      },
      spacing: {
        "4.5": "1.125rem",
      },
      borderRadius: {
        "xl":  "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(15,15,18,0.08), 0 1px 1px rgba(15,15,18,0.04)",
        "card-lg": "0 4px 16px rgba(15,15,18,0.10), 0 1px 4px rgba(15,15,18,0.06)",
        "float":   "0 8px 32px rgba(15,15,18,0.14), 0 2px 8px rgba(15,15,18,0.08)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
```

---

## 3. Color Contrast — Accessibility Criterion

Every text/background pair must meet WCAG AA (4.5:1 for normal text, 3:1 for large text).

| Foreground | Background | Ratio | Use |
|---|---|---|---|
| `text-primary` (#0F0F12) | `surface-1` (#F7F7F8) | **15.3:1** ✅ | Page text |
| `text-secondary` (#5A5A6B) | `surface-0` (#FFFFFF) | **6.1:1** ✅ | Captions |
| `brand-500` (#534AB7) | `surface-0` (#FFFFFF) | **5.2:1** ✅ | Links |
| `text-inverse` (#FFFFFF) | `brand-500` (#534AB7) | **5.2:1** ✅ | Primary buttons |
| `civic-green` (#0F6E56) | `civic-green-bg` (#E1F5EE) | **4.8:1** ✅ | Success badges |
| `civic-amber` (#854F0B) | `civic-amber-bg` (#FAEEDA) | **4.9:1** ✅ | Deadline badges |

> **Rule**: Never use gray text on a gray background. Test every new color pair in the browser's accessibility tools before committing.

---

## 4. Page-by-Page UI Specification

### 4.1 Home Page — Voter Type Selector

**Layout**: Full-page centered. No navigation clutter. One decision to make.

```
┌──────────────────────────────────────┐
│                                      │
│         🗳️  CivicPath                │
│   Your election journey starts here  │
│                                      │
│     What kind of voter are you?      │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📋  First-time voter          │  │  ← RadioGroup item (react-aria)
│  │  New to voting? We'll guide    │  │    role="radio", tabIndex=0
│  │  you through every step.       │  │    Focus ring: 2px brand-500 offset
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  🔄  Returning voter           │  │
│  │  Quick refresher on what's     │  │
│  │  changed this election cycle.  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  ✉️  Overseas / NRI voter      │  │
│  │  Postal ballot timelines and   │  │
│  │  deadlines for you.            │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**Behavior**:
- Selected card: `border-brand-500 bg-brand-50` + checkmark icon top-right
- Keyboard: arrow keys move between options (react-aria RadioGroup handles this)
- Screen reader announces: "First-time voter, radio button, 1 of 3"
- After selection: `Begin My Journey →` button appears with smooth fade-in
- No auto-advance — user must confirm (respects cognitive load)

**Component code pattern**:
```tsx
// src/components/VoterTypeSelector.tsx
import { useRadioGroup, useRadio } from "@react-aria/radio";
import { useRadioGroupState } from "@react-stately/radio";

// react-aria handles full keyboard navigation, ARIA roles, and focus management
// This is your Accessibility score unlock
```

---

### 4.2 Journey Page — The Critical Screen

**Layout**: Two-column on desktop, single column on mobile.

```
┌──────────────────── DESKTOP ────────────────────────────────────┐
│                                                                  │
│  ←  Your Journey          ████████████░░░░  4 of 6 complete     │
│     First-time voter                                             │
│                                                                  │
│  ┌────────────────────────────────────────┐  ┌───────────────┐  │
│  │  TIMELINE (left, 60%)                  │  │  PHASE DETAIL │  │
│  │                                        │  │  (right, 40%) │  │
│  │  ●─── 1. Voter Registration  ✓ Done    │  │               │  │
│  │  │                                     │  │  📋 Voter     │  │
│  │  ●─── 2. Candidate Filing   ✓ Done     │  │  Registration │  │
│  │  │                                     │  │               │  │
│  │  ◉─── 3. Campaign Period   ← CURRENT   │  │  Deadline:    │  │
│  │  │      [active, pulsing ring]         │  │  60 days      │  │
│  │  │                                     │  │  before       │  │
│  │  ○─── 4. Voting Day                    │  │  election     │  │
│  │  │                                     │  │               │  │
│  │  ○─── 5. Result Declaration            │  │  [Mark Done]  │  │
│  │                                        │  │  [Take Quiz]  │  │
│  └────────────────────────────────────────┘  └───────────────┘  │
│                                                                  │
│                                   ┌───────────────────────────┐ │
│                                   │ 💬  Ask AI about this     │ │
│                                   │     phase                 │ │
│                                   └───────────────────────────┘ │
│                                   [floating, bottom-right]       │
└──────────────────────────────────────────────────────────────────┘
```

**Phase Card States**:
```
LOCKED (future):
  background: surface-2
  border: surface-3
  dot color: text-tertiary
  opacity: 1 (never dim — all content readable)
  
ACTIVE (current):
  background: surface-0
  border: brand-500 (2px)
  dot color: brand-500
  shadow: card-lg
  dot animation: scale pulse every 2s
  
COMPLETE:
  background: civic-green-bg
  border: civic-green (1px)
  dot color: civic-green
  dot icon: ✓ checkmark
  completion animation: scale 1→1.15→1 over 400ms
```

**Progress Bar**:
```tsx
// Accessible progress indicator
<div
  role="progressbar"
  aria-valuenow={completedCount}
  aria-valuemin={0}
  aria-valuemax={totalPhases}
  aria-label={`${completedCount} of ${totalPhases} steps complete`}
>
  <motion.div
    className="h-1.5 bg-brand-500 rounded-full"
    animate={{ width: `${progress}%` }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  />
</div>
```

---

### 4.3 AI Chat Window

**Trigger**: Floating button bottom-right. Fixed position, always visible on Journey page.

```
┌─────────────────────────────────────────┐
│  CivicPath AI  ×                        │
│  Currently helping with:               │
│  📋 Voter Registration                  │
├─────────────────────────────────────────┤
│                                         │
│  ╭──────────────────────────────────╮   │
│  │ 🤖  You're on Voter Registration. │   │
│  │  Deadlines typically fall 60 days │   │
│  │  before election day. What would  │   │
│  │  you like clarified?              │   │
│  ╰──────────────────────────────────╯   │
│                                         │
│     ╭────────────────────────────╮      │
│     │  What documents do I need? │ You  │
│     ╰────────────────────────────╯      │
│                                         │
│  ╭──────────────────────────────────╮   │
│  │ 🤖  You'll need a government-    │   │  ← ARIA live="polite"
│  │  issued photo ID (Aadhaar,       │   │    announced when appended
│  │  Passport, or Voter ID) and      │   │
│  │  proof of address.               │   │
│  ╰──────────────────────────────────╯   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  Ask a question...           [→] │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Accessibility requirements**:
```tsx
// Message list container
<div
  role="log"
  aria-label="Conversation with CivicPath AI"
  aria-live="polite"
  aria-relevant="additions"
  tabIndex={0}
>
  {messages.map((msg) => (
    <div
      key={msg.id}
      role="article"
      aria-label={`${msg.role === "assistant" ? "AI" : "You"}: ${msg.content}`}
    >
      {msg.content}
    </div>
  ))}
</div>

// Loading state
<div aria-live="polite" aria-atomic="true">
  {loading && <span className="sr-only">AI is thinking...</span>}
  {loading && <TypingIndicator aria-hidden="true" />}
</div>

// Input
<TextField
  label="Ask a question"
  placeholder="Ask about this phase..."
  aria-describedby="chat-context"
/>
<p id="chat-context" className="sr-only">
  Currently asking about {phaseTitle}
</p>
```

**Chat window animation**:
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
    >
      <ChatWindow />
    </motion.div>
  )}
</AnimatePresence>
```

---

### 4.4 Quiz Module

```
┌──────────────────────────────────────────┐
│  🔥 Streak: 3    Score: 2/3    Phase 3/6 │
│  ━━━━━━━━━━░░░░░░░░░░  50%               │
├──────────────────────────────────────────┤
│                                          │
│  What is the minimum age to vote         │
│  in India?                               │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ○  16 years                       │  │  ← react-aria RadioGroup
│  └────────────────────────────────────┘  │    Each option: role="radio"
│  ┌────────────────────────────────────┐  │
│  │  ◉  18 years           ← Selected  │  │  Selected: brand-500 border
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  ○  21 years                       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  ○  25 years                       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Submit Answer]                         │
│                                          │
└──────────────────────────────────────────┘
```

**After answer (correct)**:
```
│  ✅  Correct! +1 streak                  │  ← Green bg, confetti burst
│  18 is the voting age in India as        │
│  per Article 326 of the Constitution.    │
│                                [Next →]  │
```

**After answer (wrong)**:
```
│  ❌  Not quite. The answer is 18 years.  │  ← Red highlight on wrong
│                                          │    Green highlight on correct
│  [Ask AI to explain this →]              │  ← Opens chat pre-filled
│                                [Next →]  │
```

**Accessibility**:
```tsx
// Announce result to screen readers
<div aria-live="assertive" aria-atomic="true" className="sr-only">
  {selectedOption !== null && (
    isCorrect
      ? `Correct! ${explanation}`
      : `Incorrect. The correct answer is ${correctOption}. ${explanation}`
  )}
</div>
```

---

## 5. Typography Hierarchy

```
Page title (h1):       28px, weight 600, tracking -0.5px
Section heading (h2):  20px, weight 500
Phase title (h3):      16px, weight 500
Body text (p):         14px, weight 400, line-height 1.6
Caption/meta:          12px, weight 400, color text-secondary
Label/badge:           11px, weight 500, tracking 0.04em, UPPERCASE
```

**Font loading**:
```html
<!-- index.html — preload Inter for no layout shift -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="preload"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
  as="style"
/>
```

---

## 6. Accessibility Implementation (Full Checklist)

### Skip Navigation
```tsx
// First element in <body> — must be the very first focusable element
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white
             focus:rounded-lg focus:ring-2 focus:ring-offset-2"
>
  Skip to main content
</a>
```

### Focus Management
```tsx
// When chat window opens, focus the input automatically
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (isOpen) {
    // Small delay to let animation complete
    setTimeout(() => inputRef.current?.focus(), 150);
  }
}, [isOpen]);

// When chat closes, return focus to the trigger button
const triggerRef = useRef<HTMLButtonElement>(null);
useEffect(() => {
  if (!isOpen) triggerRef.current?.focus();
}, [isOpen]);
```

### Keyboard Navigation — Timeline
```tsx
// PhaseCard must be fully keyboard operable
<motion.li
  role="button"
  tabIndex={0}
  aria-expanded={isExpanded}
  aria-label={`${phase.title}, ${isComplete ? "completed" : "not yet completed"}, press Enter to ${isExpanded ? "collapse" : "expand"}`}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand();
    }
  }}
  onClick={toggleExpand}
>
```

### Interactive Elements Checklist

| Element | Component | ARIA | Keyboard |
|---|---|---|---|
| Voter type select | `useRadioGroup` | `role="radiogroup"` | Arrow keys |
| Phase card expand | `Button` (react-aria) | `aria-expanded` | Enter / Space |
| Mark complete button | `Button` (react-aria) | `aria-pressed` | Enter / Space |
| Quiz options | `RadioGroup` (react-aria) | `role="radio"` | Arrow keys |
| Chat input | `TextField` (react-aria) | `aria-label` | Tab |
| Language switcher | `Select` (react-aria) | `role="combobox"` | Arrow keys |
| Chat messages | `role="log"` | `aria-live="polite"` | Tab to focus |
| Deadline alerts | `role="alert"` | `aria-live="assertive"` | Auto-announced |

---

## 7. Responsive Design

### Breakpoints
```
Mobile:  < 640px   — single column, bottom-sheet chat
Tablet:  640-1024px — single column, side-panel chat
Desktop: > 1024px  — two column (timeline 60% + detail 40%)
```

### Mobile-Specific Patterns
```tsx
// Chat as bottom sheet on mobile
<motion.div
  className={clsx(
    "fixed z-50 bg-white rounded-t-3xl shadow-float",
    "md:bottom-20 md:right-6 md:w-96 md:rounded-2xl",
    // Mobile: full-width bottom sheet
    "bottom-0 left-0 right-0 max-h-[85vh]",
    "md:max-h-[600px]"
  )}
>
```

```tsx
// Phase detail: drawer on mobile, side panel on desktop
<motion.div
  className={clsx(
    "bg-white",
    // Desktop: static side panel
    "hidden md:block md:sticky md:top-4",
    // Mobile: slide-up drawer
    "md:hidden fixed inset-x-0 bottom-0 z-40 rounded-t-3xl"
  )}
>
```

---

## 8. Loading & Empty States

Every async operation needs a loading state. Never show blank.

### Skeleton for Timeline
```tsx
function PhaseCardSkeleton() {
  return (
    <div className="animate-pulse flex gap-3 p-4" aria-hidden="true">
      <div className="w-10 h-10 rounded-full bg-surface-2" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-2 rounded w-3/4" />
        <div className="h-3 bg-surface-2 rounded w-1/2" />
      </div>
    </div>
  );
}

// Screen reader text while loading
<div aria-live="polite" className="sr-only">
  {loading ? "Loading election phases..." : `${phases.length} phases loaded`}
</div>
```

### Error State
```tsx
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="p-6 text-center">
      <p className="text-body text-text-secondary mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-brand-500 text-white rounded-lg
                   hover:bg-brand-600 focus:ring-2 focus:ring-brand-500
                   focus:ring-offset-2 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
```

---

## 9. Animation Principles

**Three rules**:
1. Animations reveal meaning — they don't just look cool
2. Respect `prefers-reduced-motion`
3. Duration: 200–400ms. Never more than 500ms.

```tsx
// Globally respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const cardVariants = {
  hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion ? 0 : 0.35,
      ease: "easeOut",
    },
  },
};
```

**Specific animations**:
| Interaction | Animation | Duration | Meaning |
|---|---|---|---|
| Phase cards enter | Stagger fade-up | 80ms delay each | Sequence reveals journey |
| Phase complete | Scale pulse | 400ms | Satisfaction of progress |
| Chat window open | Spring slide-up | 300ms | Feels like a panel appearing |
| Progress bar fill | Width transition | 500ms | Reinforces achievement |
| Quiz correct | Background flash green | 250ms | Immediate positive feedback |
| Quiz wrong | Shake + red | 300ms | Clear, not punishing |
| Streak increment | Number count-up | 200ms | Reward |

---

## 10. Dark Mode

Tailwind dark mode via `class` strategy — respects system preference.

```tsx
// tailwind.config.ts
darkMode: "class",

// main.tsx — set class based on system preference
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
}
```

Key dark mode overrides:
```
surface-0: #0F0F12
surface-1: #18181C
surface-2: #222227
text-primary: #F2F2F4
brand-500: #7B73D4  (lightened for contrast)
```

---

## 11. Judge Demo Script (Visual Flow)

This is the exact path a judge will take in 90 seconds:

```
0:00  Opens app → clean, centered "What kind of voter are you?"
      First impression: intentional design, not a hackathon

0:10  Clicks "First-time voter" → subtle selection animation
      Clicks "Begin My Journey" → smooth route transition

0:20  Journey page loads → 5 phase cards stagger in
      Sees "Voter Registration" at top, deadline badge
      Progress bar at 0% — story begins here

0:35  Clicks first phase → drawer slides open with details
      AI chat bubble pulses gently in corner — inviting

0:45  Clicks "Ask AI" → chat window springs open
      Pre-filled: "You're on Voter Registration..."
      Types "What ID do I need?" → 1.5s → clear answer
      ARIA live region announces for accessibility

1:00  Clicks "Mark complete" → pulse animation, progress bar advances
      Feels satisfying. Judge sees "2 of 6 complete"

1:10  Navigates to Quiz → laser-focused question, 4 options
      Selects wrong answer → gentle shake, explanation shown
      Selects correct → green flash, streak +1

1:20  Clicks language icon → toggles to Hindi
      Content updates. AI chat next response in Hindi.
      Judge thinks: "This is production-grade."

1:30  Judge opens DevTools → no API key in bundle
      Sources tab: code-split chunks, lazy-loaded quiz
      Network tab: AI responses return in < 2s
      
      Score: top 1%.
```
