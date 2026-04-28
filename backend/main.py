import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # must run before any service imports that read env vars

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from routers import chat, checklist, fact_check, maps, quiz, timeline, translate  # noqa: E402
from slowapi import Limiter, _rate_limit_exceeded_handler  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402
from slowapi.util import get_remote_address  # noqa: E402

logger = logging.getLogger("electiq")


# ─── Security headers middleware ─────────────────────────────────────────────
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Embed RAG knowledge base at startup
    try:
        from services.rag import init_rag

        init_rag()
    except Exception:
        import traceback

        logger.warning(
            "[RAG] Startup embedding failed. Check your GCP Console "
            "(Vertex AI API enabled? Roles assigned?)"
        )
        traceback.print_exc()
    yield


# ─── CORS origins from environment (never hard-coded) ────────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ElectIQ API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global exception handler — never leaks internal detail ──────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    origin = request.headers.get("origin", "")
    cors_origin = origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[0]
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
            **SECURITY_HEADERS,
        },
    )


# ─── Inject security headers on every response ───────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


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
