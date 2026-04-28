from unittest.mock import MagicMock, patch


def test_leaderboard_public(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = (
        []
    )
    with patch("routers.quiz.get_supabase", return_value=mock_sb):
        r = client.get("/api/quiz/leaderboard")
        assert r.status_code == 200
        assert "leaderboard" in r.json()


def test_quiz_generate_requires_auth(client):
    r = client.post("/api/quiz/generate")
    assert r.status_code == 401


def test_quiz_generate_success(client, auth_headers):
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{"score": 0}]

    mock_model = MagicMock()

    # Mock the async method generate_content_async
    async def mock_generate(*args, **kwargs):
        class Resp:
            text = '[{"question": "1?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "x"}, {"question": "2?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "x"}, {"question": "3?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "x"}, {"question": "4?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "x"}, {"question": "5?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "x"}]'

        return Resp()

    mock_model.generate_content_async = mock_generate

    from main import app
    from services.supabase_client import verify_session

    app.dependency_overrides[verify_session] = lambda: "test-uid"

    with patch("routers.quiz.get_supabase", return_value=mock_sb), patch(
        "routers.quiz.get_model", return_value=mock_model
    ):
        r = client.post("/api/quiz/generate", headers=auth_headers)
        assert r.status_code == 200
        assert "questions" in r.json()

    app.dependency_overrides.clear()
