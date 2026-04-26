import json
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from ..services.rag import get_top_k, cache_key, _cache
from ..services.vertex import get_model
from ..services.sanitise import sanitise
from ..services.supabase_client import verify_session, get_supabase

router = APIRouter(prefix="/api/fact-check", tags=["fact-check"])
limiter = Limiter(key_func=get_remote_address)


class ClaimRequest(BaseModel):
    claim: str


class FlagRequest(BaseModel):
    claim: str
    verdict_returned: str


FACT_CHECK_PROMPT = """You are a non-partisan election fact-checker.
Given the following verified election facts as context, evaluate the user's claim.
Return ONLY valid JSON with this exact structure:
{{"verdict": "TRUE|FALSE|MISLEADING|CONTEXT-DEPENDENT", "explanation": "2-3 sentences", "sources": ["source1"]}}

Context facts:
{context}

User claim: {claim}"""


@router.post("")
@limiter.limit("20/minute")
async def fact_check(
    request: Request,
    body: ClaimRequest,
    session_id: str = Depends(verify_session),
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

    response = await model.generate_content_async(
        [Content(role="user", parts=[Part.from_text(prompt)])],
        generation_config={"response_mime_type": "application/json"},
    )
    try:
        result = json.loads(response.text)
    except Exception:
        result = {
            "verdict": "CONTEXT-DEPENDENT",
            "explanation": response.text[:300],
            "sources": [],
        }

    _cache[ck] = result
    return {**result, "cached": False}


@router.post("/flag")
async def flag_result(
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
