import hashlib
import json
import logging
import os
import pathlib

import numpy as np
from cachetools import TTLCache

logger = logging.getLogger(__name__)

_cache: TTLCache = TTLCache(maxsize=500, ttl=3600)
_kb: list = []
_embeddings: list = []


def _cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def _get_embedding_model():
    """Return a TextEmbeddingModel, reusing the singleton Vertex init."""
    from services.vertex import _ensure_vertex
    from vertexai.language_models import TextEmbeddingModel

    _ensure_vertex()
    return TextEmbeddingModel.from_pretrained("text-embedding-004")


def init_rag():
    """Call once at startup — embeds all KB items."""
    global _kb, _embeddings
    p = pathlib.Path(__file__).parent.parent / "data" / "misinformation_kb.json"
    _kb = json.loads(p.read_text(encoding="utf-8"))
    logger.info("[RAG] Embedding %d KB items...", len(_kb))

    model = _get_embedding_model()
    texts = [item["claim"] for item in _kb]
    result = model.get_embeddings(texts)
    _embeddings = [r.values for r in result]
    logger.info("[RAG] KB embeddings ready — %d vectors loaded.", len(_embeddings))


def get_top_k(claim: str, k: int = 3) -> list:
    """Embed claim, return top-k KB items by cosine similarity."""
    if not _embeddings:
        logger.warning("[RAG] get_top_k called but KB is empty — returning []")
        return []

    model = _get_embedding_model()
    q_emb = model.get_embeddings([claim])[0].values
    scores = [(_cosine(q_emb, e), i) for i, e in enumerate(_embeddings)]
    scores.sort(reverse=True)
    return [_kb[i] for _, i in scores[:k]]


def cache_key(claim: str) -> str:
    return hashlib.sha256(claim.encode()).hexdigest()


def kb_size() -> int:
    """Return the number of KB items loaded — used by /ready probe."""
    return len(_embeddings)
