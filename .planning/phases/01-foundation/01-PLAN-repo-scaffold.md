---
phase: 1
plan: 1
title: "Repo Scaffold & Docker Compose"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - docker-compose.yml
  - .env.example
  - .gitignore
  - frontend/package.json
  - frontend/vite.config.ts
  - frontend/tailwind.config.ts
  - frontend/src/main.tsx
  - frontend/src/App.tsx
  - frontend/index.html
  - backend/main.py
  - backend/requirements.txt
  - backend/Dockerfile
  - frontend/Dockerfile
requirements:
  - REQ-008
---

<objective>
Scaffold the complete monorepo: Vite 5 + React 18 + TypeScript frontend, FastAPI backend, and Docker Compose orchestration. Both services must start cleanly with `docker-compose up` and serve on their respective ports.
</objective>

<tasks>

<task id="1.1.1">
<title>Scaffold Vite React TypeScript frontend</title>
<type>execute</type>
<read_first>
- frontend/ directory (check if it exists)
</read_first>
<action>
Run from project root:
```
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install zustand react-router-dom framer-motion react-i18next i18next
npm install -D tailwindcss @tailwindcss/vite autoprefixer
```

Create `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

Create `frontend/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a4e8a', foreground: '#ffffff' },
        accent:  { DEFAULT: '#f59e0b', foreground: '#111827' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
} satisfies Config
```

Update `frontend/src/main.tsx`:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
```

Update `frontend/src/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import "tailwindcss";

:root {
  --primary: #1a4e8a;
  --accent: #f59e0b;
}

* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; margin: 0; background: #f9fafb; }
```

Create minimal `frontend/src/App.tsx`:
```typescript
import { Routes, Route } from 'react-router-dom'

function Home() {
  return <div className="p-8 text-2xl font-bold text-primary-DEFAULT">ElectIQ — Coming soon</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
```
</action>
<acceptance_criteria>
- `frontend/package.json` contains `"react": "^18"`, `"vite"`, `"zustand"`, `"framer-motion"`, `"react-router-dom"`, `"react-i18next"`
- `frontend/vite.config.ts` contains `proxy: { '/api': 'http://localhost:8000' }`
- `npm run dev` inside `frontend/` starts without error and serves on port 5173
- `frontend/src/index.css` contains `@import "tailwindcss"`
</acceptance_criteria>
</task>

<task id="1.1.2">
<title>Scaffold FastAPI backend</title>
<type>execute</type>
<read_first>
- backend/ directory (check if it exists)
</read_first>
<action>
Create `backend/` directory structure:
```
backend/
  main.py
  requirements.txt
  routers/
    __init__.py
    chat.py
    checklist.py
    quiz.py
    fact_check.py
    translate.py
    maps.py
  services/
    __init__.py
    vertex.py
    supabase_client.py
    sanitise.py
  models/
    __init__.py
    chat.py
    quiz.py
    fact_check.py
  data/
    election_phases.json
    faq.json
    quiz_questions.json
    misinformation_kb.json
```

Create `backend/requirements.txt`:
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
google-cloud-aiplatform==1.52.0
google-cloud-translate==3.15.0
supabase==2.4.0
python-dotenv==1.0.1
bleach==6.1.0
slowapi==0.1.9
cachetools==5.3.3
pydantic[email]==2.7.1
httpx==0.27.0
sse-starlette==2.1.0
pytest==8.2.0
pytest-asyncio==0.23.6
respx==0.21.1
ruff==0.4.3
black==24.4.2
mypy==1.10.0
```

Create `backend/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ElectIQ API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

Create `backend/services/sanitise.py`:
```python
import bleach

def sanitise(text: str, max_len: int = 1000) -> str:
    """Strip HTML/script tags and truncate before forwarding to AI."""
    cleaned = bleach.clean(text, tags=[], strip=True)
    return cleaned[:max_len].strip()
```

Create `backend/services/supabase_client.py`:
```python
import os
from supabase import create_client, Client

_client: Client | None = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _client
```
</action>
<acceptance_criteria>
- `backend/requirements.txt` contains `fastapi`, `uvicorn[standard]`, `google-cloud-aiplatform`, `supabase`, `bleach`, `slowapi`, `sse-starlette`
- `backend/main.py` contains `CORSMiddleware` with `allow_origins=["http://localhost:5173"]`
- `backend/services/sanitise.py` contains `bleach.clean(text, tags=[], strip=True)`
- `GET http://localhost:8000/health` returns `{"status": "ok"}` after `uvicorn main:app --reload`
- `backend/routers/`, `backend/services/`, `backend/models/`, `backend/data/` directories exist
</acceptance_criteria>
</task>

<task id="1.1.3">
<title>Docker Compose + .env setup</title>
<type>execute</type>
<read_first>
- docker-compose.yml (if exists)
- .env.example (if exists)
</read_first>
<action>
Create `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `docker-compose.yml` at project root:
```yaml
version: "3.9"
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    volumes:
      - ./credentials:/app/credentials:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    env_file: .env
    depends_on:
      backend:
        condition: service_healthy
```

Create `.env.example`:
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vertex AI
VERTEX_AI_PROJECT=your-gcp-project-id
VERTEX_AI_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json

# Frontend (exposed to Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

Create `.gitignore` (root):
```
.env
credentials/
__pycache__/
*.pyc
.pytest_cache/
node_modules/
frontend/dist/
.DS_Store
*.egg-info/
.mypy_cache/
.ruff_cache/
```
</action>
<acceptance_criteria>
- `docker-compose.yml` contains `services: backend:` and `services: frontend:` with correct ports
- `docker-compose.yml` contains `healthcheck` on backend service
- `.env.example` contains `SUPABASE_URL`, `VERTEX_AI_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, `VITE_SUPABASE_URL`
- `.gitignore` contains `.env` and `credentials/`
- `docker-compose config` runs without YAML errors
</acceptance_criteria>
</task>

</tasks>

<verification>
1. `cd frontend && npm run dev` — browser shows "ElectIQ — Coming soon" at localhost:5173
2. `cd backend && uvicorn main:app --reload` — `GET localhost:8000/health` returns `{"status": "ok"}`
3. `docker-compose config` validates without errors
4. `.env` is listed in `.gitignore` (confirmed: `git check-ignore .env` outputs `.env`)
5. `frontend/package.json` contains all required dependencies
</verification>

<success_criteria>
- [ ] Both services start cleanly
- [ ] `GET /health` returns 200
- [ ] Vite dev server proxies `/api` to port 8000
- [ ] `.env` never committed (gitignored)
- [ ] All required directories exist: `backend/routers/`, `backend/services/`, `backend/models/`, `backend/data/`
</success_criteria>

<must_haves>
- Working monorepo scaffold that can be `docker-compose up`'d
- CORS locked to localhost:5173
- `.env` gitignored
- Proxy from Vite to FastAPI configured
</must_haves>

## PLANNING COMPLETE
