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


@pytest.mark.asyncio
async def test_get_bundle_en():
    with patch("routers.translate.pathlib.Path.read_text", return_value='{"hello": "hello world"}'):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/translate/bundle", params={"lang": "en"})

        assert response.status_code == 200
        assert response.json() == {"hello": "hello world"}


@pytest.mark.asyncio
async def test_get_bundle_hi(monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT", "test-project")

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_translation = MagicMock()
    mock_translation.translated_text = "नमस्ते दुनिया"
    mock_resp.translations = [mock_translation]
    mock_client.translate_text.return_value = mock_resp

    with patch("routers.translate.translate_v3.TranslationServiceClient", return_value=mock_client):
        with patch(
            "routers.translate.pathlib.Path.read_text", return_value='{"hello": "hello world"}'
        ):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.get("/api/translate/bundle", params={"lang": "hi"})

                assert response.status_code == 200
                assert response.json() == {"hello": "नमस्ते दुनिया"}

                # Check cache
                response2 = await ac.get("/api/translate/bundle", params={"lang": "hi"})
                assert response2.status_code == 200
                assert response2.json() == {"hello": "नमस्ते दुनिया"}
                mock_client.translate_text.assert_called_once()  # should be cached
