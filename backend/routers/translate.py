import json
import logging
import os
import pathlib

from cachetools import TTLCache
from fastapi import APIRouter
from google.cloud import translate_v3

logger = logging.getLogger(__name__)


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
    return json.loads(p.read_text())


@router.get("/bundle")
async def get_bundle(lang: str = "en"):
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
        return base

    try:
        client = _get_client()
        parent = f"projects/{project}/locations/global"

        translated = {}
        for key, val in base.items():
            resp = client.translate_text(
                request={
                    "parent": parent,
                    "contents": [val],
                    "target_language_code": lang,
                    "source_language_code": "en",
                    "mime_type": "text/plain",
                }
            )
            translated[key] = resp.translations[0].translated_text

        _cache[lang] = translated
        return translated
    except Exception:
        logger.warning(
            "[translate] Cloud Translation failed for lang=%s — returning English fallback", lang
        )
        # Return English strings so the frontend can still render meaningfully
        return base
