# ElectIQ — Project Config

**Version:** 1.0.0
**Created:** 2026-04-26
**Source:** Bootstrapped from ElectIQ_PRD.docx via PRD Express Path

## Project Summary

ElectIQ is a civic-tech PWA that makes electoral participation accessible and engaging through a conversational AI chatbot, an interactive election timeline, multilingual support (50+ languages), a polling booth locator, a voter checklist, a quiz/gamification engine, and a misinformation buster. Built in 48 hours for the Hack2Skills × Google hackathon.

## Stack

- **Frontend:** React 18 + Vite 5, Tailwind CSS 3, shadcn/ui, Zustand, React Router v6, Framer Motion, react-i18next
- **Backend:** Python 3.11 + FastAPI, Pydantic v2, google-cloud-aiplatform (Vertex AI), google-cloud-translate v3, supabase-py
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Google Services:** Vertex AI (Gemini 1.5 Flash), Cloud Translation API v3, Google Maps JS API
- **Infrastructure:** Docker Compose (local dev), GitHub CI (pre-push hooks)

## Mission

Make electoral participation accessible to every eligible voter by eliminating three root causes of low turnout: not knowing how to participate, not knowing where to vote, and not knowing what to believe.
