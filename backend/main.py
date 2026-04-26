from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

# Import routers
from routers import chat, timeline, checklist, translate, fact_check


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Embed RAG knowledge base at startup
    try:
        from services.rag import init_rag
        init_rag()
    except Exception as e:
        print(f"[RAG] Startup embedding skipped (missing credentials?): {e}")
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ElectIQ API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(chat.router)
app.include_router(timeline.router)
app.include_router(checklist.router)
app.include_router(translate.router)
app.include_router(fact_check.router)


@app.get("/health")
def health():
    return {"status": "ok"}
