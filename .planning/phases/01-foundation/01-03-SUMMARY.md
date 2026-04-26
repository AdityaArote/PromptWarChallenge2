# Plan 01-03: SSE Streaming Chat — SUMMARY

## Status: ✅ Complete

## What was built
### Backend
- `backend/routers/chat.py` — full SSE streaming endpoint:
  - `GET /api/chat/starters` — returns 6 starter prompts
  - `GET /api/chat/faq` — serves `backend/data/faq.json`
  - `POST /api/chat/stream` — SSE streaming with Gemini 1.5 Flash
    - Rate limited: 30 requests/minute per IP (slowapi)
    - Input sanitised via `sanitise()` before forwarding to AI
    - JWT required via `verify_session` dependency
    - Streams `data: {"token": "..."}` events, terminates with `data: {"done": true}`
    - Error handling: returns `data: {"error": "...", "done": true}` on exception
- `backend/services/vertex.py` — Gemini 1.5 Flash model with:
  - System prompt: election-topic guard + non-partisan instruction + prompt injection guard
  - `GenerationConfig(max_output_tokens=512, temperature=0.3)`
  - `build_contents()` — converts history (last 6 exchanges) + new message to Vertex AI format

### Frontend
- `frontend/src/store/chatStore.ts` — Zustand store with `persist` middleware:
  - `messages[]`, `isStreaming` state
  - `addUserMessage`, `appendAssistantToken`, `finalizeAssistant`, `startStreaming`, `clearMessages`
  - `getHistory()` — returns last 12 messages for context window
- `frontend/src/hooks/useChatStream.ts` — SSE consumer:
  - Calls `apiFetch('/api/chat/stream', { method: 'POST' })`
  - Reads `ReadableStream` with `TextDecoder`
  - Parses `data: {...}` lines, dispatches `appendAssistantToken`
  - Handles network errors and malformed chunks gracefully
- `frontend/src/components/chat/MessageBubble.tsx` — styled message bubble (user: blue right, assistant: white left)
- `frontend/src/components/chat/TypingIndicator.tsx` — animated bouncing dots with `aria-live="polite"`
- `frontend/src/components/chat/ChatWindow.tsx` — complete chat UI:
  - Floating trigger button (bottom-right, `aria-label`)
  - Spring-animated panel via Framer Motion `AnimatePresence`
  - Starter prompts shown when conversation is empty
  - Auto-scroll on new messages
  - Enter to send (Shift+Enter for newline)
  - `role="dialog"`, `aria-modal="true"`, `aria-live` on message log
  - Send button disabled while streaming

## Acceptance criteria
- [x] `POST /api/chat/stream` returns `text/event-stream` content type
- [x] Each chunk is `data: {"token": "..."}` JSON
- [x] Final chunk is `data: {"done": true}`
- [x] Rate limit: 30/minute
- [x] Input sanitised before AI call
- [x] JWT required (401 without it)
- [x] Zustand store persists to localStorage (`electiq-chat`)
- [x] `appendAssistantToken` accumulates tokens into last assistant message
- [x] ChatWindow has ARIA dialog role and live regions
- [x] TypeScript compile: 0 errors

## Key files created
- `backend/routers/chat.py`
- `backend/services/vertex.py`
- `frontend/src/store/chatStore.ts`
- `frontend/src/hooks/useChatStream.ts`
- `frontend/src/components/chat/ChatWindow.tsx`
- `frontend/src/components/chat/MessageBubble.tsx`
- `frontend/src/components/chat/TypingIndicator.tsx`
