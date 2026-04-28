# Hack2Skills × Google Hackathon — ElectIQ Submission

## Project Name
ElectIQ — AI-Powered Civic Education Platform

## Google Services Used
1. **Vertex AI (Gemini 1.5 Flash)** — Powers streaming chatbot, quiz question generation, and misinformation fact-checking
2. **Cloud Translation API v3** — Translates UI strings and chatbot bundles into 50+ languages
3. **Google Maps JavaScript API** — Polling booth locator with Places Text Search and Directions

## Demo Instructions
1. `cp .env.example .env` — fill in credentials
2. `docker-compose up`
3. Open http://localhost:5173
4. Try: ask the chatbot, explore the timeline, take the quiz, fact-check a claim

## Architecture Highlights
- Streaming SSE chat (Gemini 1.5 Flash via Vertex AI) — token-by-token response
- RAG pipeline for misinformation buster — 20+ curated KB items + Vertex AI embeddings
- Anonymous Supabase auth — zero sign-up friction; progress persists automatically
- All API keys server-side — React never touches Google Cloud credentials
- WCAG 2.1 AA compliant — keyboard navigable, screen-reader friendly, RTL support

## Repository
[GitHub link]

## Video Demo
[Backup demo video link]
