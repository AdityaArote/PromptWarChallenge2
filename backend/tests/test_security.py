"""
test_security.py — Cross-cutting security concerns.

Tests:
  - Auth enforcement on every protected route
  - Empty / whitespace-only Bearer token rejected
  - Coordinate bounds (maps)
  - Fact-check min/max length enforcement
  - Security headers present on every response
  - /ready probe returns 503 when RAG KB is empty
"""

from unittest.mock import patch

import pytest
from main import app
from services.supabase_client import verify_session

# ─── Auth enforcement — protected routes return 401 without a token ───────────

PROTECTED_ROUTES: list[tuple[str, str, dict | None]] = [
    ("POST", "/api/chat/stream", {"message": "hello", "history": []}),
    ("GET", "/api/checklist", None),
    ("POST", "/api/quiz/generate", None),
    ("POST", "/api/quiz/submit", {"questions": [], "answers": []}),
    ("POST", "/api/fact-check", {"claim": "elections are rigged"}),
    ("POST", "/api/fact-check/flag", {"claim": "test claim", "verdict_returned": "FALSE"}),
]


@pytest.mark.parametrize("method,path,body", PROTECTED_ROUTES)
def test_protected_route_without_auth_returns_401(client, method, path, body):
    fn = getattr(client, method.lower())
    r = fn(path, json=body) if body is not None else fn(path)
    assert r.status_code == 401, f"{method} {path} should require auth, got {r.status_code}"


# ─── Bearer token edge cases ──────────────────────────────────────────────────


def test_empty_bearer_token_rejected(client):
    """'Authorization: Bearer ' with no token must return 401."""
    r = client.get("/api/checklist", headers={"Authorization": "Bearer "})
    assert r.status_code == 401


def test_whitespace_only_token_rejected(client):
    """'Authorization: Bearer    ' (spaces only) must return 401."""
    r = client.get("/api/checklist", headers={"Authorization": "Bearer    "})
    assert r.status_code == 401


def test_missing_bearer_prefix_rejected(client):
    """'Authorization: sometoken' without 'Bearer ' prefix must return 401."""
    r = client.get("/api/checklist", headers={"Authorization": "sometoken"})
    assert r.status_code == 401


# ─── Coordinate bounds ────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "lat,lng",
    [
        (91.0, 0.0),  # lat too high
        (-91.0, 0.0),  # lat too low
        (0.0, 181.0),  # lng too high
        (0.0, -181.0),  # lng too low
        (200.0, 200.0),  # both out of range
    ],
)
@pytest.mark.asyncio
async def test_maps_invalid_coordinates_rejected(lat, lng):
    from httpx import ASGITransport, AsyncClient

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/maps/search", params={"lat": lat, "lng": lng})
    assert r.status_code == 422, f"Expected 422 for lat={lat}, lng={lng}, got {r.status_code}"


# ─── Fact-check input validation ──────────────────────────────────────────────


def test_fact_check_too_short_claim_rejected(client):
    """Claims shorter than 5 characters must be rejected with 422."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        r = client.post("/api/fact-check", json={"claim": "hi"})
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_fact_check_too_long_claim_rejected(client):
    """Claims longer than 500 characters must be rejected with 422."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        r = client.post("/api/fact-check", json={"claim": "x" * 501})
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_fact_check_empty_claim_rejected(client):
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        r = client.post("/api/fact-check", json={"claim": ""})
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()


# ─── Security headers ─────────────────────────────────────────────────────────

EXPECTED_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "geolocation=(), microphone=(), camera=()",
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "content-security-policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://*.supabase.co https://*.googleapis.com; "
        "frame-ancestors 'none';"
    ),
}


@pytest.mark.parametrize("path", ["/health", "/ready", "/api/chat/starters"])
def test_security_headers_present(client, path):
    with patch("services.rag.kb_size", return_value=5):
        r = client.get(path)
    for header, value in EXPECTED_HEADERS.items():
        assert header in r.headers, f"Missing header: {header} on {path}"
        assert (
            r.headers[header] == value
        ), f"Header {header} on {path}: expected {value!r}, got {r.headers[header]!r}"


# ─── Readiness probe ──────────────────────────────────────────────────────────


def test_ready_returns_503_when_kb_empty(client):
    with patch("services.rag.kb_size", return_value=0):
        r = client.get("/ready")
    assert r.status_code == 503
    assert r.json()["status"] == "not_ready"


def test_ready_returns_200_when_kb_loaded(client):
    with patch("services.rag.kb_size", return_value=42):
        r = client.get("/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"
    assert r.json()["kb_size"] == 42
