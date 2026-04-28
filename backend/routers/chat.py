import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from models.chat import ChatRequest
from services.sanitise import sanitise
from services.supabase_client import verify_session
from services.vertex import build_contents, get_model
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/chat", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)

STARTER_PROMPTS = [
    "How do I register to vote?",
    "What ID do I need to vote?",
    "Where is my polling booth?",
    "When is voting day?",
    "What happens if I miss the registration deadline?",
    "How are votes counted?",
]


@router.get("/starters")
async def get_starters():
    return {"prompts": STARTER_PROMPTS}


@router.get("/faq")
async def get_faq():
    import pathlib

    faq_path = pathlib.Path(__file__).parent.parent / "data" / "faq.json"
    return json.loads(faq_path.read_text())


@router.post("/stream")
@limiter.limit("30/minute")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    session_id: str = Depends(verify_session),
):
    clean_message = sanitise(body.message)
    if not clean_message:

        async def empty():
            yield 'data: {"token": "", "done": true}\n\n'

        return StreamingResponse(empty(), media_type="text/event-stream")

    model = get_model()
    contents = build_contents(
        [m.model_dump() for m in body.history],
        clean_message,
    )

    async def generate():
        try:
            responses = await model.generate_content_async(contents, stream=True)
            async for chunk in responses:
                if chunk.text:
                    yield f'data: {json.dumps({"token": chunk.text})}\n\n'
            yield 'data: {"done": true}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"error": str(e), "done": True})}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
