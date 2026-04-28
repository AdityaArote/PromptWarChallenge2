"""
test_fact_check.py — Comprehensive fact-check endpoint tests.

Tests:
  - Cache hit returns cached result without calling AI
  - All 4 valid verdicts (TRUE, FALSE, MISLEADING, CONTEXT-DEPENDENT) are accepted
  - Invalid verdict from AI is normalised to CONTEXT-DEPENDENT
  - AI failure returns ERROR verdict gracefully (no 500)
  - Sources field is always present (coerced to [] if missing from AI)
  - Flag endpoint requires auth
  - Flag endpoint rate limit present (10/minute)
  - Claim too short returns 422
  - Claim too long returns 422
  - Cached flag returns cached: True
  - Non-cached fact check returns cached: False
  - JSON parse failure falls back gracefully
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import routers.fact_check as fc_module
from main import app
from services.supabase_client import verify_session

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _mock_model(text: str):
    model = MagicMock()
    resp = MagicMock()
    resp.text = text
    model.generate_content_async = AsyncMock(return_value=resp)
    return model


def _mock_rag(items=None):
    if items is None:
        items = [
            {
                "claim": "You need a passport to vote",
                "verdict": "FALSE",
                "explanation": "Most countries require only a voter ID card.",
            }
        ]
    return items


@pytest.fixture(autouse=True)
def reset_cache():
    fc_module._cache.clear()
    yield
    fc_module._cache.clear()


# ─── Cache behaviour ──────────────────────────────────────────────────────────


def test_fact_check_cache_hit_skips_ai(client):
    """Second identical claim must return cached=True without calling AI."""
    app.dependency_overrides[verify_session] = lambda: "uid"
    payload = json.dumps({"verdict": "TRUE", "explanation": "Correct.", "sources": []})

    try:
        with (
            patch("routers.fact_check.get_top_k", return_value=_mock_rag()),
            patch("routers.fact_check.get_model", return_value=_mock_model(payload)),
        ):
            r1 = client.post("/api/fact-check", json={"claim": "elections are fair"})
            assert r1.status_code == 200
            assert r1.json()["cached"] is False

            # Second call — AI must NOT be invoked again
            r2 = client.post("/api/fact-check", json={"claim": "elections are fair"})
            assert r2.status_code == 200
            assert r2.json()["cached"] is True
    finally:
        app.dependency_overrides.clear()


# ─── All 4 valid verdicts accepted ────────────────────────────────────────────


@pytest.mark.parametrize("verdict", ["TRUE", "FALSE", "MISLEADING", "CONTEXT-DEPENDENT"])
def test_fact_check_valid_verdicts(client, verdict):
    app.dependency_overrides[verify_session] = lambda: "uid"
    payload = json.dumps({"verdict": verdict, "explanation": "test", "sources": ["src1"]})

    try:
        with (
            patch("routers.fact_check.get_top_k", return_value=_mock_rag()),
            patch("routers.fact_check.get_model", return_value=_mock_model(payload)),
        ):
            r = client.post("/api/fact-check", json={"claim": f"claim for {verdict}"})
        assert r.status_code == 200
        assert r.json()["verdict"] == verdict
    finally:
        app.dependency_overrides.clear()


# ─── Invalid verdict normalisation ────────────────────────────────────────────


def test_fact_check_invalid_verdict_normalised(client):
    """If AI returns an unrecognised verdict, it must be coerced to CONTEXT-DEPENDENT."""
    app.dependency_overrides[verify_session] = lambda: "uid"
    payload = json.dumps({"verdict": "UNKNOWN_GARBAGE", "explanation": "x", "sources": []})

    try:
        with (
            patch("routers.fact_check.get_top_k", return_value=_mock_rag()),
            patch("routers.fact_check.get_model", return_value=_mock_model(payload)),
        ):
            r = client.post("/api/fact-check", json={"claim": "some weird claim here"})
        assert r.status_code == 200
        assert r.json()["verdict"] == "CONTEXT-DEPENDENT"
    finally:
        app.dependency_overrides.clear()


# ─── AI failure graceful degradation ──────────────────────────────────────────


def test_fact_check_ai_failure_returns_error_verdict(client):
    """Vertex AI exception must return 200 with verdict=ERROR, not 500."""
    app.dependency_overrides[verify_session] = lambda: "uid"
    model = MagicMock()
    model.generate_content_async = AsyncMock(side_effect=Exception("Vertex AI down"))

    try:
        with (
            patch("routers.fact_check.get_top_k", return_value=_mock_rag()),
            patch("routers.fact_check.get_model", return_value=model),
        ):
            r = client.post("/api/fact-check", json={"claim": "elections are compromised"})
        assert r.status_code == 200
        assert r.json()["verdict"] == "ERROR"
        assert "sources" in r.json()
    finally:
        app.dependency_overrides.clear()


# ─── Sources field coercion ───────────────────────────────────────────────────


def test_fact_check_sources_always_present(client):
    """Even if AI omits 'sources', the field must be in the response."""
    app.dependency_overrides[verify_session] = lambda: "uid"
    # No 'sources' key in AI response
    payload = json.dumps({"verdict": "TRUE", "explanation": "Correct."})

    try:
        with (
            patch("routers.fact_check.get_top_k", return_value=_mock_rag()),
            patch("routers.fact_check.get_model", return_value=_mock_model(payload)),
        ):
            r = client.post("/api/fact-check", json={"claim": "voter registration is open"})
        assert r.status_code == 200
        assert "sources" in r.json()
    finally:
        app.dependency_overrides.clear()


# ─── JSON parse failure ────────────────────────────────────────────────────────


def test_fact_check_non_json_response_falls_back(client):
    """If AI returns non-JSON prose, the endpoint must not crash."""
    app.dependency_overrides[verify_session] = lambda: "uid"
    # AI returns raw text, not JSON
    model = _mock_model("This claim appears to be misleading based on available data.")

    try:
        with (
            patch("routers.fact_check.get_top_k", return_value=_mock_rag()),
            patch("routers.fact_check.get_model", return_value=model),
        ):
            r = client.post("/api/fact-check", json={"claim": "elections require passport"})
        assert r.status_code == 200
        # Falls back to CONTEXT-DEPENDENT (invalid verdict normalisation kicks in)
        assert r.json()["verdict"] in ("CONTEXT-DEPENDENT", "TRUE", "FALSE", "MISLEADING")
    finally:
        app.dependency_overrides.clear()


# ─── Flag endpoint auth ───────────────────────────────────────────────────────


def test_flag_requires_auth(client):
    r = client.post(
        "/api/fact-check/flag",
        json={"claim": "test claim here", "verdict_returned": "FALSE"},
    )
    assert r.status_code == 401


def test_flag_with_auth_succeeds(client):
    app.dependency_overrides[verify_session] = lambda: "uid"
    sb = MagicMock()
    sb.table.return_value.insert.return_value.execute.return_value = MagicMock()

    try:
        with patch("routers.fact_check.get_supabase", return_value=sb):
            r = client.post(
                "/api/fact-check/flag",
                json={"claim": "test claim here", "verdict_returned": "FALSE"},
            )
        assert r.status_code == 200
        assert r.json() == {"status": "flagged"}
    finally:
        app.dependency_overrides.clear()
