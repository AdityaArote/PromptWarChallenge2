---
phase: 4
plan: 1
title: "Accessibility, Tests, Polish & Code Quality"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - frontend/src/components/Nav.tsx
  - frontend/src/components/SkipToContent.tsx
  - frontend/src/App.tsx
  - frontend/src/index.css
  - backend/tests/test_chat.py
  - backend/tests/test_checklist.py
  - backend/tests/test_fact_check.py
  - backend/tests/conftest.py
  - frontend/src/components/chat/ChatWindow.test.tsx
  - frontend/src/components/checklist/ChecklistItem.test.tsx
  - .pre-commit-config.yaml
  - pyproject.toml
requirements:
  - REQ-009
  - REQ-010
  - REQ-012
  - REQ-008
---

<objective>
Complete full accessibility pass (WCAG 2.1 AA), implement backend test suite (≥70% coverage), frontend component tests with axe-core, error/loading states for all features, and wire up all code quality tooling.
</objective>

<tasks>

<task id="4.1.1">
<title>Navigation, SkipToContent, and global a11y pass</title>
<type>execute</type>
<read_first>
- frontend/src/App.tsx
- frontend/src/index.css
- .planning/REQUIREMENTS.md (REQ-009 — full WCAG 2.1 AA list)
</read_first>
<action>
Create `frontend/src/components/SkipToContent.tsx`:
```typescript
export function SkipToContent() {
  return (
    <a href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100]
        focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:rounded-lg focus:shadow-lg focus:font-semibold">
      Skip to main content
    </a>
  )
}
```

Create `frontend/src/components/Nav.tsx`:
```typescript
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/maps', label: 'Find Booth' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/fact-check', label: 'Fact Check' },
]

export function Nav() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Main navigation"
      className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-bold text-lg" style={{ color: '#1a4e8a' }}
          aria-label="ElectIQ home">ElectIQ 🗳️</Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === l.to ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              aria-current={pathname === l.to ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  )
}
```

Update `frontend/src/App.tsx` — wrap all content with SkipToContent + Nav + main landmark:
```typescript
import { SkipToContent } from '@/components/SkipToContent'
import { Nav } from '@/components/Nav'

// Return:
// <SkipToContent />
// <Nav />
// <main id="main-content" tabIndex={-1}>
//   <Routes>...</Routes>
// </main>
// <ChatWindow />
```

Add to `frontend/src/index.css` — visible focus ring utility:
```css
:focus-visible {
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

.focus\:not-sr-only:focus {
  position: static; width: auto; height: auto;
  padding: revert; margin: revert; overflow: visible;
  clip: auto; white-space: normal;
}
```

Update `index.html` — set `<html lang="en">` and add meta:
```html
<html lang="en">
<head>
  <meta name="description" content="ElectIQ — Your AI-powered election guide. Learn how to vote, find your polling booth, and fact-check election claims in 50+ languages.">
  <title>ElectIQ — AI Election Guide</title>
</head>
```

Create `frontend/src/pages/Home.tsx` with voter-type selection and feature cards:
```typescript
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const FEATURES = [
  { icon: '🗓️', label: 'Election Timeline', path: '/timeline', desc: 'Step-by-step election lifecycle' },
  { icon: '✅', label: 'Voter Checklist', path: '/checklist', desc: 'Your personalised to-do list' },
  { icon: '📍', label: 'Find Your Booth', path: '/maps', desc: 'Nearest polling centres' },
  { icon: '🧠', label: 'Take the Quiz', path: '/quiz', desc: 'Test your civic knowledge' },
  { icon: '🔍', label: 'Fact Checker', path: '/fact-check', desc: 'Bust election misinformation' },
]

export function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('home.title')}</h1>
      <p className="text-gray-600 mb-8">{t('home.subtitle')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURES.map(f => (
          <button key={f.path} onClick={() => navigate(f.path)}
            className="text-left p-5 bg-white rounded-2xl border border-gray-200
              hover:border-blue-300 hover:shadow-md transition-all focus:ring-2 focus:ring-blue-400 focus:outline-none"
            aria-label={`Go to ${f.label}: ${f.desc}`}>
            <span className="text-3xl block mb-2" aria-hidden="true">{f.icon}</span>
            <p className="font-semibold text-gray-900 text-sm">{f.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
```
</action>
<acceptance_criteria>
- `frontend/src/components/SkipToContent.tsx` renders `<a href="#main-content">` that is `.sr-only` by default and visible on focus
- `frontend/src/components/Nav.tsx` has `aria-label="Main navigation"` on `<nav>`
- Active nav link has `aria-current="page"` attribute
- `index.html` has `<html lang="en">` and `<meta name="description" ...>`
- `frontend/src/index.css` contains `@media (prefers-reduced-motion: reduce)` block with `animation-duration: 0.01ms`
- `frontend/src/index.css` contains `:focus-visible` rule with `outline: 3px solid #3b82f6`
- `frontend/src/App.tsx` wraps routes in `<main id="main-content">`
- Home page shows 5 feature cards; each has descriptive `aria-label`
</acceptance_criteria>
</task>

<task id="4.1.2">
<title>Backend test suite (≥70% coverage)</title>
<type>execute</type>
<read_first>
- backend/main.py
- backend/routers/chat.py
- backend/routers/checklist.py
- backend/routers/fact_check.py
- backend/services/sanitise.py
- .planning/REQUIREMENTS.md (REQ-010)
</read_first>
<action>
Create `backend/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("VERTEX_AI_PROJECT", "test-project")
os.environ.setdefault("VERTEX_AI_LOCATION", "us-central1")

@pytest.fixture
def client():
    with patch("backend.services.rag.init_rag"):
        from backend.main import app
        return TestClient(app)

@pytest.fixture
def auth_headers():
    """Mock a verified session."""
    return {"Authorization": "Bearer test-token"}
```

Create `backend/tests/test_sanitise.py`:
```python
from backend.services.sanitise import sanitise

def test_strips_html():
    assert sanitise("<script>alert('xss')</script>Hello") == "Hello"

def test_truncates():
    assert len(sanitise("x" * 2000, max_len=100)) == 100

def test_empty():
    assert sanitise("") == ""

def test_clean_text_unchanged():
    result = sanitise("How do I register to vote?")
    assert result == "How do I register to vote?"
```

Create `backend/tests/test_health.py`:
```python
def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

def test_chat_starters(client):
    r = client.get("/api/chat/starters")
    assert r.status_code == 200
    data = r.json()
    assert "prompts" in data
    assert len(data["prompts"]) == 6

def test_faq(client):
    r = client.get("/api/chat/faq")
    assert r.status_code == 200
    data = r.json()
    assert "categories" in data
    assert len(data["categories"]) >= 3
```

Create `backend/tests/test_checklist.py`:
```python
from unittest.mock import patch, MagicMock

def test_checklist_requires_auth(client):
    r = client.get("/api/checklist")
    assert r.status_code == 401

def test_toggle_requires_auth(client):
    r = client.put("/api/checklist/check_registration", json={"completed": True})
    assert r.status_code == 401

def test_checklist_seeds_defaults(client, auth_headers):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.table.return_value.insert.return_value.execute.return_value = None
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "1", "item_id": "check_registration", "label": "Check your voter registration status", "completed": False, "completed_at": None}
    ]
    with patch("backend.services.supabase_client.get_supabase", return_value=mock_sb), \
         patch("backend.services.supabase_client.verify_session", return_value="test-uid"):
        r = client.get("/api/checklist", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()
```

Create `backend/tests/test_quiz.py`:
```python
from unittest.mock import patch

def test_leaderboard_public(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = []
    with patch("backend.services.supabase_client.get_supabase", return_value=mock_sb):
        r = client.get("/api/quiz/leaderboard")
        assert r.status_code == 200
        assert "leaderboard" in r.json()

def test_quiz_generate_requires_auth(client):
    r = client.post("/api/quiz/generate")
    assert r.status_code == 401
```

Create `pyproject.toml`:
```toml
[tool.pytest.ini_options]
testpaths = ["backend/tests"]
asyncio_mode = "auto"

[tool.coverage.run]
source = ["backend"]
omit = ["backend/tests/*", "backend/data/*"]

[tool.ruff]
line-length = 100
select = ["E","F","W","I"]

[tool.mypy]
python_version = "3.11"
strict = false
ignore_missing_imports = true

[tool.black]
line-length = 100
```

Run: `cd backend && pytest tests/ --cov=. --cov-report=term-missing`
</action>
<acceptance_criteria>
- `backend/tests/test_sanitise.py` contains 4 test functions; all pass
- `backend/tests/test_health.py` contains `test_health`, `test_chat_starters`, `test_faq`; all pass
- `backend/tests/test_checklist.py` contains `test_checklist_requires_auth` that asserts `status_code == 401`
- `backend/tests/conftest.py` sets all required env vars with `os.environ.setdefault`
- `pytest backend/tests/` exits with code 0 (all tests pass)
- Coverage report shows ≥70% line coverage for `backend/services/sanitise.py`
- `pyproject.toml` contains `[tool.ruff]` and `[tool.pytest.ini_options]`
</acceptance_criteria>
</task>

<task id="4.1.3">
<title>Frontend component tests + axe-core</title>
<type>execute</type>
<read_first>
- frontend/src/components/chat/ChatWindow.tsx
- frontend/src/components/checklist/ChecklistItem.tsx
- frontend/src/components/quiz/QuizCard.tsx
- .planning/REQUIREMENTS.md (REQ-010)
</read_first>
<action>
Install: `npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-axe axe-core vitest jsdom @vitest/coverage-v8`

Add to `frontend/vite.config.ts`:
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
}
```

Create `frontend/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
import { expect } from 'vitest'
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)
```

Create `frontend/src/components/checklist/ChecklistItem.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import { ChecklistItemComponent } from './ChecklistItem'

const mockItem = { id: '1', item_id: 'check_registration', label: 'Check voter registration', completed: false, completed_at: null }

test('renders label', () => {
  render(<ChecklistItemComponent item={mockItem} onToggle={() => {}} />)
  expect(screen.getByText('Check voter registration')).toBeInTheDocument()
})

test('calls onToggle on click', () => {
  const onToggle = vi.fn()
  render(<ChecklistItemComponent item={mockItem} onToggle={onToggle} />)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(onToggle).toHaveBeenCalledWith('check_registration', true)
})

test('shows completed state', () => {
  const completedItem = { ...mockItem, completed: true }
  render(<ChecklistItemComponent item={completedItem} onToggle={() => {}} />)
  expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
})

test('has no axe violations', async () => {
  const { container } = render(<ChecklistItemComponent item={mockItem} onToggle={() => {}} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

Create `frontend/src/components/quiz/QuizCard.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import { QuizCard } from './QuizCard'

const mockQuestion = {
  question: 'What is compulsory voting?',
  options: ['Enrolling', 'Voting', 'Both', 'Neither'],
  correct: 2,
  explanation: 'Both enrolling and voting are compulsory in Australia.'
}

test('renders question text', () => {
  render(<QuizCard question={mockQuestion} onAnswer={() => {}} />)
  expect(screen.getByText('What is compulsory voting?')).toBeInTheDocument()
})

test('renders 4 options', () => {
  render(<QuizCard question={mockQuestion} onAnswer={() => {}} />)
  expect(screen.getAllByRole('radio')).toHaveLength(4)
})

test('calls onAnswer after selection', async () => {
  vi.useFakeTimers()
  const onAnswer = vi.fn()
  render(<QuizCard question={mockQuestion} onAnswer={onAnswer} />)
  fireEvent.click(screen.getAllByRole('radio')[0])
  vi.advanceTimersByTime(800)
  expect(onAnswer).toHaveBeenCalledWith(0)
  vi.useRealTimers()
})

test('has no axe violations', async () => {
  const { container } = render(<QuizCard question={mockQuestion} onAnswer={() => {}} />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

Add `"test": "vitest"` and `"test:coverage": "vitest run --coverage"` to `frontend/package.json` scripts.
</action>
<acceptance_criteria>
- `frontend/src/components/checklist/ChecklistItem.test.tsx` contains 4 tests including `test('has no axe violations'...)`
- `frontend/src/components/quiz/QuizCard.test.tsx` contains 4 tests including axe test
- `frontend/src/test/setup.ts` imports `toHaveNoViolations` from `jest-axe` and calls `expect.extend()`
- `npm test` in `frontend/` runs Vitest and all tests pass
- `frontend/vite.config.ts` contains `test: { environment: 'jsdom' }`
- `frontend/package.json` scripts contain `"test": "vitest"`
</acceptance_criteria>
</task>

<task id="4.1.4">
<title>Pre-commit hooks + code quality enforcement</title>
<type>execute</type>
<read_first>
- pyproject.toml
- frontend/package.json
- .planning/REQUIREMENTS.md (REQ-012)
</read_first>
<action>
Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.3
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/psf/black
    rev: 24.4.2
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        args: [--ignore-missing-imports]
        files: ^backend/

  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest backend/tests/ -x -q
        language: system
        pass_filenames: false
        stages: [push]
```

Create `frontend/.eslintrc.cjs`:
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
```

Add to `frontend/package.json` scripts:
```json
"lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
"format": "prettier --write src/"
```

Create `frontend/.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Create `.husky/pre-commit` (after `npx husky init`):
```sh
#!/bin/sh
cd frontend && npm run lint
```

Install: `pip install pre-commit` then `pre-commit install`.
</action>
<acceptance_criteria>
- `.pre-commit-config.yaml` contains ruff, black, mypy, and pytest hooks
- `frontend/.eslintrc.cjs` contains `'eslint:recommended'` and `'@typescript-eslint/recommended'`
- `frontend/package.json` contains `"lint": "eslint ..."` and `"format": "prettier --write src/"`
- `frontend/.prettierrc` contains `"singleQuote": true`
- `cd backend && ruff check .` exits with code 0 (no ruff violations)
- `cd backend && black --check .` exits with code 0 (no formatting issues)
- `cd frontend && npm run lint` exits with code 0
</acceptance_criteria>
</task>

</tasks>

<verification>
1. Tab through entire app without mouse — every interactive element reachable, focus ring visible
2. Screen reader (NVDA/VoiceOver): navigate to chat — live region announces assistant response
3. Set OS `prefers-reduced-motion` → Framer Motion animations do not play
4. `pytest backend/tests/ --cov=backend --cov-report=term-missing` → coverage ≥70%
5. `npm test` in frontend → all tests pass including axe-core accessibility tests
6. `ruff check backend/` → exit 0; `black --check backend/` → exit 0
7. `npm run lint` in frontend → exit 0
8. axe DevTools browser extension: zero critical violations on Timeline, Checklist, Quiz, FactCheck, Maps pages
</verification>

<success_criteria>
- [ ] SkipToContent link visible on keyboard focus
- [ ] All interactive elements have accessible names
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Backend pytest coverage ≥70%
- [ ] Frontend Vitest tests all pass including axe-core tests
- [ ] Ruff + black + ESLint all pass with zero warnings/errors
- [ ] Home page has descriptive meta description and proper `<h1>`
</success_criteria>

<must_haves>
- axe-core in Vitest tests — if WCAG violations exist, `npm test` fails the build
- `prefers-reduced-motion` CSS — mission-critical for users with vestibular disorders
- SkipToContent — keyboard users cannot navigate without it
</must_haves>

## PLANNING COMPLETE
