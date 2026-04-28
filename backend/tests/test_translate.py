"""
test_translate.py — Translation bundle endpoint tests.

Tests:
  - English bundle returns base strings directly (no API call)
  - Unknown language falls back to English
  - Hindi bundle triggers exactly 1 batched API call (not N per-string calls)
  - Second request for same language hits cache (translate_text not called again)
  - Missing VERTEX_AI_PROJECT env var falls back to English without crash
  - Translate API exception falls back to English gracefully
"""

from unittest.mock import MagicMock, patch

import pytest
import routers.translate
from httpx import ASGITransport, AsyncClient
from main import app


@pytest.fixture(autouse=True)
def reset_translate_cache():
    routers.translate._cache.clear()
    routers.translate._client = None
    yield
    routers.translate._cache.clear()
    routers.translate._client = None


BASE_STRINGS = '{"nav.home": "Home", "nav.quiz": "Quiz", "home.title": "Your election guide"}'
EXPECTED_BASE = {"nav.home": "Home", "nav.quiz": "Quiz", "home.title": "Your election guide"}


def _make_mock_client(translations: list[str]):
    """Build a mock translate client that returns *translations* for a single batched call."""
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.translations = [MagicMock(translated_text=t) for t in translations]
    client.translate_text.return_value = mock_resp
    return client


# ─── English — no API call ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_bundle_en_returns_base_strings_no_api_call():
    with patch("routers.translate.pathlib.Path.read_text", return_value=BASE_STRINGS):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/translate/bundle", params={"lang": "en"})
    assert r.status_code == 200
    assert r.json() == EXPECTED_BASE


# ─── Unknown language falls back to English ───────────────────────────────────


@pytest.mark.asyncio
async def test_get_bundle_unknown_lang_falls_back_to_english():
    with patch("routers.translate.pathlib.Path.read_text", return_value=BASE_STRINGS):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/translate/bundle", params={"lang": "xx"})
    assert r.status_code == 200
    assert r.json() == EXPECTED_BASE


# ─── KEY TEST: single batched call ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_bundle_hi_uses_exactly_one_batched_api_call(monkeypatch):
    """
    Critical efficiency test: translate.py must call translate_text exactly ONCE
    with all strings batched in a single request, not N times (once per string).
    """
    monkeypatch.setenv("VERTEX_AI_PROJECT", "test-project")
    translated_values = ["होम", "क्विज़", "आपका चुनाव गाइड"]
    mock_client = _make_mock_client(translated_values)

    with (
        patch("routers.translate.pathlib.Path.read_text", return_value=BASE_STRINGS),
        patch(
            "routers.translate.translate_v3.TranslationServiceClient",
            return_value=mock_client,
        ),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/translate/bundle", params={"lang": "hi"})

    assert r.status_code == 200
    result = r.json()
    assert result["nav.home"] == "होम"
    assert result["nav.quiz"] == "क्विज़"

    # THE KEY ASSERTION: exactly 1 call, not 3 (one per string)
    mock_client.translate_text.assert_called_once()

    # Verify the single call batched all strings together
    call_kwargs = mock_client.translate_text.call_args
    request_payload = call_kwargs[1].get("request") or call_kwargs[0][0]
    assert len(request_payload["contents"]) == 3  # all 3 strings in one call


# ─── Cache hit: second request doesn't call API ───────────────────────────────


@pytest.mark.asyncio
async def test_get_bundle_hi_cached_on_second_request(monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT", "test-project")
    translated_values = ["होम", "क्विज़", "आपका चुनाव गाइड"]
    mock_client = _make_mock_client(translated_values)

    with (
        patch("routers.translate.pathlib.Path.read_text", return_value=BASE_STRINGS),
        patch(
            "routers.translate.translate_v3.TranslationServiceClient",
            return_value=mock_client,
        ),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r1 = await ac.get("/api/translate/bundle", params={"lang": "hi"})
            r2 = await ac.get("/api/translate/bundle", params={"lang": "hi"})

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json() == r2.json()
    # translate_text must only be called ONCE across both requests
    mock_client.translate_text.assert_called_once()


# ─── Missing VERTEX_AI_PROJECT env var ────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_bundle_missing_project_falls_back_to_english(monkeypatch):
    monkeypatch.delenv("VERTEX_AI_PROJECT", raising=False)
    with patch("routers.translate.pathlib.Path.read_text", return_value=BASE_STRINGS):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/translate/bundle", params={"lang": "hi"})
    assert r.status_code == 200
    assert r.json() == EXPECTED_BASE


# ─── API exception → graceful English fallback ────────────────────────────────


@pytest.mark.asyncio
async def test_get_bundle_api_exception_falls_back_to_english(monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT", "test-project")
    mock_client = MagicMock()
    mock_client.translate_text.side_effect = Exception("Cloud Translation unavailable")

    with (
        patch("routers.translate.pathlib.Path.read_text", return_value=BASE_STRINGS),
        patch(
            "routers.translate.translate_v3.TranslationServiceClient",
            return_value=mock_client,
        ),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/translate/bundle", params={"lang": "es"})
    assert r.status_code == 200
    assert r.json() == EXPECTED_BASE
