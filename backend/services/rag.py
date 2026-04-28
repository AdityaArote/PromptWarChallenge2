import hashlib
import json
import os
import pathlib

import numpy as np
from cachetools import TTLCache

_cache: TTLCache = TTLCache(maxsize=500, ttl=3600)
_kb: list = []
_embeddings: list = []


def _cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def init_rag():
    """Call once at startup — embeds all KB items."""
    global _kb, _embeddings
    import vertexai
    from vertexai.language_models import TextEmbeddingModel

    p = pathlib.Path(__file__).parent.parent / "data" / "misinformation_kb.json"
    _kb = json.loads(p.read_text(encoding="utf-8"))
    vertexai.init(
        project=os.environ["VERTEX_AI_PROJECT"],
        location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"),
    )
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    print(f"[RAG] Embedding {len(_kb)} KB items...")
    texts = [item["claim"] for item in _kb]
    result = model.get_embeddings(texts)
    _embeddings = [r.values for r in result]
    print("[RAG] KB embeddings ready.")


def get_top_k(claim: str, k: int = 3) -> list:
    """Embed claim, return top-k KB items by cosine similarity."""
    import vertexai
    from vertexai.language_models import TextEmbeddingModel

    vertexai.init(
        project=os.environ["VERTEX_AI_PROJECT"],
        location=os.environ.get("VERTEX_AI_LOCATION", "us-central1"),
    )
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    q_emb = model.get_embeddings([claim])[0].values
    scores = [(_cosine(q_emb, e), i) for i, e in enumerate(_embeddings)]
    scores.sort(reverse=True)
    return [_kb[i] for _, i in scores[:k]]


def cache_key(claim: str) -> str:
    return hashlib.sha256(claim.encode()).hexdigest()
