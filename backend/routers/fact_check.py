import json
import logging

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from services.rag import _cache, cache_key, get_top_k
from services.sanitise import sanitise
from services.supabase_client import get_supabase, verify_session
from services.vertex import get_model
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/fact-check", tags=["fact-check"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("electiq")

_VALID_VERDICTS = {"TRUE", "FALSE", "MISLEADING", "CONTEXT-DEPENDENT"}


class ClaimRequest(BaseModel):
    claim: str = Field(..., min_length=5, max_length=500)


class FlagRequest(BaseModel):
    claim: str = Field(..., max_length=500)
    verdict_returned: str = Field(..., max_length=50)


FACT_CHECK_PROMPT = """You are a non-partisan election fact-checker.
Given the following verified election facts as context, evaluate the user's claim.
{{"verdict": "TRUE|FALSE|MISLEADING|CONTEXT-DEPENDENT",
  "explanation": "2-3 sentences",
  "sources": ["source1"]}}

Context facts:
{context}

User claim: {claim}"""


@router.post("")
@limiter.limit("20/minute")
async def fact_check(
    request: Request,
    body: ClaimRequest,
):
    clean = sanitise(body.claim, max_len=500)
    ck = cache_key(clean)
    if ck in _cache:
        return {**_cache[ck], "cached": True}

    top_k = get_top_k(clean)
    context = "\n".join(
        [
            f"- Claim: {item['claim']} | Verdict: {item['verdict']} | {item['explanation']}"
            for item in top_k
        ]
    )
    prompt = FACT_CHECK_PROMPT.format(context=context, claim=clean)

    model = get_model()
    from vertexai.generative_models import Content, Part

    try:
        response = await model.generate_content_async(
            [Content(role="user", parts=[Part.from_text(prompt)])],
            generation_config={"response_mime_type": "application/json"},
        )
    except Exception:
        logger.exception("[FactCheck] Vertex AI error")
        return {
            "verdict": "ERROR",
            "explanation": "AI service temporarily unavailable. Please try again.",
            "sources": [],
        }

    try:
        result = json.loads(response.text)
    except Exception:
        result = {
            "verdict": "CONTEXT-DEPENDENT",
            "explanation": response.text[:300],
            "sources": [],
        }

    # Enforce verdict is one of the known values
    if result.get("verdict") not in _VALID_VERDICTS:
        logger.warning(
            "[FactCheck] Unexpected verdict from AI: %s — defaulting", result.get("verdict")
        )
        result["verdict"] = "CONTEXT-DEPENDENT"

    # Guarantee sources field is always present
    result.setdefault("sources", [])

    _cache[ck] = result
    return {**result, "cached": False}


@router.post("/flag")
@limiter.limit("10/minute")
async def flag_result(
    request: Request,
    body: FlagRequest,
    session_id: str = Depends(verify_session),
):
    get_supabase().table("fact_check_flags").insert(
        {
            "claim": body.claim[:500],
            "verdict_returned": body.verdict_returned,
            "flagged_by": session_id,
        }
    ).execute()
    return {"status": "flagged"}
