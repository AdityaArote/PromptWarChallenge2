import json
import logging
import os
import pathlib

from cachetools import TTLCache
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Module-level import so test patches on `routers.translate.translate_v3` work correctly.
try:
    from google.cloud import translate_v3
except ImportError:  # pragma: no cover — only missing in bare envs
    translate_v3 = None  # type: ignore[assignment]

router = APIRouter(prefix="/api/translate", tags=["translate"])
_cache: TTLCache = TTLCache(maxsize=100, ttl=86400)
_client = None

PRIORITY_LANGS = ["en", "hi", "es", "fr", "ar", "zh", "ur", "pt", "bn", "ru"]


def _get_client():
    global _client
    if _client is None:
        _client = translate_v3.TranslationServiceClient()
    return _client


def _get_base_strings() -> dict:
    p = pathlib.Path(__file__).parent.parent / "data" / "i18n_base.json"
    return json.loads(p.read_text(encoding="utf-8"))


@router.get("/bundle")
async def get_bundle(lang: str = "en"):
    """
    Return the full i18n bundle for *lang*.

    Uses a single batched Cloud Translation v3 call (up to 1024 strings per
    request) rather than one call per string — dramatically lower latency and
    quota consumption.
    """
    if lang not in PRIORITY_LANGS:
        lang = "en"
    if lang == "en":
        return _get_base_strings()
    if lang in _cache:
        return _cache[lang]

    base = _get_base_strings()

    project = os.environ.get("VERTEX_AI_PROJECT")
    if not project:
        # No GCP project configured — return English strings as fallback
        logger.warning("[translate] VERTEX_AI_PROJECT not set — returning English fallback")
        return base

    try:
        client = _get_client()
        parent = f"projects/{project}/locations/global"

        keys = list(base.keys())
        values = list(base.values())

        # ── Single batched call (Cloud Translation v3 supports up to 1024 strings) ──
        resp = client.translate_text(
            request={
                "parent": parent,
                "contents": values,
                "target_language_code": lang,
                "source_language_code": "en",
                "mime_type": "text/plain",
            }
        )

        translated = {
            key: translation.translated_text for key, translation in zip(keys, resp.translations)
        }

        _cache[lang] = translated
        logger.info("[translate] Batched %d strings for lang=%s in 1 API call", len(keys), lang)
        return translated

    except Exception:
        logger.warning(
            "[translate] Cloud Translation failed for lang=%s — returning English fallback", lang
        )
        return base
