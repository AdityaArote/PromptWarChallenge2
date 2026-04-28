import json
import logging
import pathlib
import random

from fastapi import APIRouter, Depends, HTTPException, Request
from models.quiz import QuizSubmission
from services.supabase_client import get_supabase, verify_session
from services.vertex import get_model
from slowapi import Limiter
from slowapi.util import get_remote_address
from vertexai.generative_models import Content, Part

router = APIRouter(prefix="/api/quiz", tags=["quiz"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("electiq")

BADGES = {
    90: "🏆 Election Expert",
    70: "⭐ Civic Scholar",
    50: "📚 Informed Voter",
    0: "🌱 Getting Started",
}


def _fallback_questions():
    p = pathlib.Path(__file__).parent.parent / "data" / "quiz_questions.json"
    qs = json.loads(p.read_text(encoding="utf-8"))
    return random.sample(qs, min(10, len(qs)))


GEN_PROMPT = (
    "Generate 10 multiple-choice quiz questions about democratic elections, "
    "voting procedures, and civic participation.\n"
    "Return ONLY valid JSON array. Each object: "
    '{"question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}\n'
    "Correct index is 0-based. Make questions educational and non-partisan."
)


@router.post("/generate")
@limiter.limit("5/minute")
async def generate_questions(request: Request, session_id: str = Depends(verify_session)):
    try:
        model = get_model()
        response = await model.generate_content_async(
            [Content(role="user", parts=[Part.from_text(GEN_PROMPT)])],
            generation_config={"response_mime_type": "application/json"},
        )
        questions = json.loads(response.text)
        if not isinstance(questions, list) or len(questions) < 5:
            raise ValueError("Bad format")
        return {"questions": questions[:10], "source": "ai"}
    except Exception:
        return {"questions": _fallback_questions(), "source": "fallback"}


@router.post("/submit")
async def submit_quiz(body: QuizSubmission, session_id: str = Depends(verify_session)):
    if not body.questions:
        raise HTTPException(status_code=400, detail="No questions provided")

    # Reject if more answers than questions — prevents score manipulation
    if len(body.answers) > len(body.questions):
        raise HTTPException(
            status_code=422,
            detail=f"Answer count ({len(body.answers)}) exceeds question count ({len(body.questions)})",
        )

    correct = sum(
        1
        for i, q in enumerate(body.questions)
        if i < len(body.answers) and body.answers[i] == q["correct"]
    )
    score = round(correct / len(body.questions) * 100)
    badge = next(b for threshold, b in sorted(BADGES.items(), reverse=True) if score >= threshold)

    try:
        get_supabase().table("quiz_scores").insert(
            {"session_id": session_id, "score": score, "badge": badge}
        ).execute()
    except Exception:
        logger.exception("[Quiz] Failed to persist score for session %s", session_id)
        # Still return the score even if saving fails

    explanations = [
        {
            "question": q["question"],
            "correct_answer": q["options"][q["correct"]],
            "explanation": q.get("explanation", ""),
            "user_correct": body.answers[i] == q["correct"] if i < len(body.answers) else False,
        }
        for i, q in enumerate(body.questions)
    ]
    return {
        "score": score,
        "badge": badge,
        "correct": correct,
        "total": len(body.questions),
        "explanations": explanations,
    }


@router.get("/leaderboard")
async def get_leaderboard():
    sb = get_supabase()
    rows = (
        sb.table("quiz_scores")
        .select("score,badge,taken_at,sessions(alias)")
        .order("score", desc=True)
        .limit(10)
        .execute()
    )
    return {
        "leaderboard": [
            {
                "alias": r["sessions"]["alias"],
                "score": r["score"],
                "badge": r["badge"],
                "taken_at": r["taken_at"],
            }
            for r in (rows.data or [])
        ]
    }
