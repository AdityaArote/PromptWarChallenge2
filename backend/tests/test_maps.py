import pytest
import respx
from httpx import ASGITransport, AsyncClient, Response
from main import app


@pytest.mark.asyncio
async def test_search_booths():
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.post("https://places.googleapis.com/v1/places:searchText").mock(
            return_value=Response(
                200,
                json={
                    "places": [
                        {
                            "displayName": {"text": "Test Polling Center"},
                            "formattedAddress": "123 Main St",
                            "location": {"latitude": 40.0, "longitude": -73.0},
                            "id": "place123",
                        }
                    ]
                },
            )
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/maps/search", params={"lat": 40.0, "lng": -73.0})

        assert response.status_code == 200
        data = response.json()
        assert "places" in data
        assert len(data["places"]) == 1
        assert data["places"][0]["name"] == "Test Polling Center"


@pytest.mark.asyncio
async def test_geocode():
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(url__startswith="https://maps.googleapis.com/maps/api/geocode/json").mock(
            return_value=Response(
                200, json={"results": [{"geometry": {"location": {"lat": 40.0, "lng": -73.0}}}]}
            )
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/maps/geocode", params={"address": "New York"})

        assert response.status_code == 200
        assert response.json() == {"lat": 40.0, "lng": -73.0}


@pytest.mark.asyncio
async def test_geocode_not_found():
    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(url__startswith="https://maps.googleapis.com/maps/api/geocode/json").mock(
            return_value=Response(200, json={"results": []})
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/maps/geocode", params={"address": "Nowhere"})

        assert response.status_code == 200
        assert response.json() == {"error": "not found"}
