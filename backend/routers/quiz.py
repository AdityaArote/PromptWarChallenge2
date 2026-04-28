import json
import logging
import pathlib
import random

from fastapi import APIRouter, Depends, HTTPException, Request
from models.quiz import QuizSubmission
from services.supabase_client import get_supabase, verify_session
from services.vertex import get_model  # noqa: F401 (used below)
from slowapi import Limiter
from slowapi.util import get_remote_address
from vertexai.generative_models import Content, Part

router = APIRouter(prefix="/api/quiz", tags=["quiz"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

BADGES = {
    90: "🏆 Election Expert",
    70: "⭐ Civic Scholar",
    50: "📚 Informed Voter",
    0: "🌱 Getting Started",
}


def _fallback_questions() -> list:
    p = pathlib.Path(__file__).parent.parent / "data" / "quiz_questions.json"
    qs = json.loads(p.read_text(encoding="utf-8"))
    return random.sample(qs, min(10, len(qs)))


def _validate_questions(questions: list) -> list:
    """
    Validate AI-generated questions and drop any that are malformed.
    Each valid question must have:
      - "question": non-empty string
      - "options": list of exactly 4 non-empty strings
      - "correct": integer in [0, 3]
      - "explanation": string (can be empty)
    Returns the filtered list (raises ValueError if none survive).
    """
    valid = []
    for i, q in enumerate(questions):
        try:
            if not isinstance(q, dict):
                raise ValueError("not a dict")
            if not isinstance(q.get("question"), str) or not q["question"].strip():
                raise ValueError("missing question text")
            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) != 4:
                raise ValueError("options must be a list of 4 items")
            if not all(isinstance(o, str) and o.strip() for o in opts):
                raise ValueError("all options must be non-empty strings")
            correct = q.get("correct")
            if not isinstance(correct, int) or not (0 <= correct <= 3):
                raise ValueError("correct index must be 0–3")
            if not isinstance(q.get("explanation", ""), str):
                raise ValueError("explanation must be a string")
            valid.append(q)
        except ValueError as exc:
            logger.warning("[Quiz] Dropping question %d — %s", i, exc)

    if not valid:
        raise ValueError("No valid questions survived validation")
    return valid


GEN_PROMPT = (
    "Generate 10 multiple-choice quiz questions about democratic elections, "
    "voting procedures, and civic participation.\n"
    "Return ONLY a valid JSON array. Each object: "
    '{"question": "...", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}\n'
    "correct is a 0-based index. Make questions educational and non-partisan."
)


@router.post("/generate")
@limiter.limit("5/minute")
async def generate_questions(request: Request):
    """Generate 10 quiz questions. No auth required — questions are public content."""
    try:
        model = get_model()
        response = await model.generate_content_async(
            [Content(role="user", parts=[Part.from_text(GEN_PROMPT)])],
            generation_config={"response_mime_type": "application/json"},
        )
        raw = json.loads(response.text)
        if not isinstance(raw, list) or len(raw) < 5:
            raise ValueError("AI returned fewer than 5 questions")
        questions = _validate_questions(raw[:10])
        logger.info("[Quiz] AI generated %d valid questions", len(questions))
        return {"questions": questions, "source": "ai"}
    except Exception:
        logger.exception("[Quiz] AI generation failed — falling back to static bank")
        return {"questions": _fallback_questions(), "source": "fallback"}


@router.post("/submit")
async def submit_quiz(body: QuizSubmission, session_id: str = Depends(verify_session)):
    if not body.questions:
        raise HTTPException(status_code=400, detail="No questions provided")

    # Reject if more answers than questions — prevents score manipulation
    if len(body.answers) > len(body.questions):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Answer count ({len(body.answers)}) exceeds "
                f"question count ({len(body.questions)})"
            ),
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
