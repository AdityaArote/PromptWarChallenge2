from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

# Import routers
from routers import chat, checklist, fact_check, maps, quiz, timeline, translate  # noqa: E402
from slowapi import Limiter, _rate_limit_exceeded_handler  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402
from slowapi.util import get_remote_address  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Embed RAG knowledge base at startup
    try:
        from services.rag import init_rag

        init_rag()
    except Exception:
        import traceback

        print(
            "[RAG] Startup embedding failed. Check your GCP Console (Vertex AI API enabled? Roles assigned?)"
        )
        traceback.print_exc()
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ElectIQ API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {exc}")
    import traceback

    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "http://localhost:5173"),
            "Access-Control-Allow-Credentials": "true",
        },
    )


# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(chat.router)
app.include_router(timeline.router)
app.include_router(checklist.router)
app.include_router(translate.router)
app.include_router(fact_check.router)
app.include_router(maps.router)
app.include_router(quiz.router)


@app.get("/health")
def health():
    return {"status": "ok"}
