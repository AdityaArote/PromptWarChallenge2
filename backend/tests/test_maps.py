import pytest
import respx
from httpx import ASGITransport, AsyncClient, Response
from main import app


# ─── Coordinate bounds validation ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_booths_invalid_lat_too_high():
    """lat > 90 must be rejected with 422 before hitting the upstream API."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/maps/search", params={"lat": 91.0, "lng": 0.0})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_search_booths_invalid_lat_too_low():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/maps/search", params={"lat": -91.0, "lng": 0.0})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_search_booths_invalid_lng_too_high():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/maps/search", params={"lat": 0.0, "lng": 181.0})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_search_booths_invalid_lng_too_low():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/maps/search", params={"lat": 0.0, "lng": -181.0})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_search_booths_boundary_values_accepted():
    """Exact boundary values (-90/90 lat, -180/180 lng) must be accepted."""
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://places.googleapis.com/v1/places:searchText").mock(
            return_value=Response(200, json={"places": []})
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/maps/search", params={"lat": 90.0, "lng": 180.0})
        assert r.status_code == 200

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/maps/search", params={"lat": -90.0, "lng": -180.0})
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_search_booths_missing_params():
    """Missing lat or lng must return 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r = await ac.get("/api/maps/search", params={"lat": 40.0})
    assert r.status_code == 422


# ─── Upstream error handling ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_booths_upstream_error_returns_502():
    """If the Places API returns an error payload, we must get 502."""
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://places.googleapis.com/v1/places:searchText").mock(
            return_value=Response(200, json={"error": {"code": 403, "message": "forbidden"}})
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/maps/search", params={"lat": 40.0, "lng": -73.0})
    assert r.status_code == 502


# ─── Valid request ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_search_booths_success():
    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://places.googleapis.com/v1/places:searchText").mock(
            return_value=Response(
                200,
                json={
                    "places": [
                        {
                            "displayName": {"text": "Test Polling Centre"},
                            "formattedAddress": "123 Main St",
                            "location": {"latitude": 40.0, "longitude": -73.0},
                            "id": "place123",
                        }
                    ]
                },
            )
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/maps/search", params={"lat": 40.0, "lng": -73.0})

    assert r.status_code == 200
    data = r.json()
    assert "places" in data
    assert len(data["places"]) == 1
    assert data["places"][0]["name"] == "Test Polling Centre"


@pytest.mark.asyncio
async def test_geocode_success():
    with respx.mock(assert_all_called=False) as mock:
        mock.get(url__startswith="https://maps.googleapis.com/maps/api/geocode/json").mock(
            return_value=Response(
                200,
                json={
                    "status": "OK",
                    "results": [{"geometry": {"location": {"lat": 40.0, "lng": -73.0}}}],
                },
            )
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/maps/geocode", params={"address": "New York"})

    assert r.status_code == 200
    assert r.json() == {"lat": 40.0, "lng": -73.0}


@pytest.mark.asyncio
async def test_geocode_not_found():
    with respx.mock(assert_all_called=False) as mock:
        mock.get(url__startswith="https://maps.googleapis.com/maps/api/geocode/json").mock(
            return_value=Response(200, json={"status": "ZERO_RESULTS", "results": []})
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            r = await ac.get("/api/maps/geocode", params={"address": "Nowhere"})

    assert r.status_code == 200
    assert r.json() == {"error": "not found"}
