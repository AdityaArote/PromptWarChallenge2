import logging
import logging.config
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

# ─── Logging configuration ────────────────────────────────────────────────────
logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%dT%H:%M:%S",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            }
        },
        "root": {"level": "INFO", "handlers": ["console"]},
    }
)

logger = logging.getLogger("electiq")

# ─── Security headers ─────────────────────────────────────────────────────────
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://*.supabase.co https://*.googleapis.com; "
        "frame-ancestors 'none';"
    ),
}

# ─── CORS origins from environment (never hard-coded) ────────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Initialising RAG knowledge base...")
    try:
        from services.rag import init_rag

        init_rag()
    except Exception:
        logger.exception(
            "[Startup] RAG embedding failed — check Vertex AI API enablement and IAM roles"
        )
    yield
    logger.info("[Shutdown] ElectIQ API shutting down.")


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ElectIQ API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ─── Inject security headers on every response ───────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


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


# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(chat.router)
app.include_router(timeline.router)
app.include_router(checklist.router)
app.include_router(translate.router)
app.include_router(fact_check.router)
app.include_router(maps.router)
app.include_router(quiz.router)


# ─── Health & Readiness probes ───────────────────────────────────────────────
@app.get("/health")
def health():
    """Liveness probe — always returns 200 if the process is alive."""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """
    Readiness probe — returns 200 only when the RAG knowledge base
    has been successfully embedded at startup.
    Returns 503 if the KB is empty (embedding failed).
    """
    from services.rag import kb_size

    size = kb_size()
    if size == 0:
        logger.warning("[Ready] RAG KB is empty — not ready")
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "reason": "RAG knowledge base not loaded"},
        )
    return {"status": "ready", "kb_size": size}
