from unittest.mock import patch

import pytest
import routers.timeline
from httpx import ASGITransport, AsyncClient
from main import app


@pytest.fixture(autouse=True)
def reset_timeline_data():
    routers.timeline._DATA = None
    yield
    routers.timeline._DATA = None


@pytest.mark.asyncio
async def test_get_timeline_first_time():
    dummy_data = {
        "phases": [
            {"id": "p1", "voter_types": ["first_time", "veteran"]},
            {"id": "p2", "voter_types": ["veteran"]},
        ]
    }
    with patch(
        "routers.timeline.pathlib.Path.read_text",
        return_value='{"phases": [{"id": "p1", "voter_types": ["first_time", "veteran"]}, {"id": "p2", "voter_types": ["veteran"]}]}',
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/timeline", params={"voter_type": "first_time"})

        assert response.status_code == 200
        data = response.json()
        assert len(data["phases"]) == 1
        assert data["phases"][0]["id"] == "p1"


@pytest.mark.asyncio
async def test_get_timeline_veteran():
    dummy_data = {
        "phases": [
            {"id": "p1", "voter_types": ["first_time", "veteran"]},
            {"id": "p2", "voter_types": ["veteran"]},
        ]
    }
    with patch(
        "routers.timeline.pathlib.Path.read_text",
        return_value='{"phases": [{"id": "p1", "voter_types": ["first_time", "veteran"]}, {"id": "p2", "voter_types": ["veteran"]}]}',
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/timeline", params={"voter_type": "veteran"})

        assert response.status_code == 200
        data = response.json()
        assert len(data["phases"]) == 2
