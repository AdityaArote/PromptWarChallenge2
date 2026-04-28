import json
from unittest.mock import MagicMock, patch

import pytest

from main import app
from services.supabase_client import verify_session

# ─── Helpers ──────────────────────────────────────────────────────────────────

VALID_QUESTIONS = [
    {"question": f"Q{i}?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "x"}
    for i in range(1, 6)
]

TEN_QUESTIONS = [
    {"question": f"Q{i}?", "options": ["A", "B", "C", "D"], "correct": i % 4, "explanation": "x"}
    for i in range(1, 11)
]


def _mock_sb():
    sb = MagicMock()
    sb.table.return_value.insert.return_value.execute.return_value.data = [{"score": 0}]
    sb.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = []
    return sb


def _mock_model(questions: list):
    model = MagicMock()

    async def mock_generate(*args, **kwargs):
        class Resp:
            text = json.dumps(questions)

        return Resp()

    model.generate_content_async = mock_generate
    return model


# ─── Auth ─────────────────────────────────────────────────────────────────────

def test_quiz_generate_requires_auth(client):
    r = client.post("/api/quiz/generate")
    assert r.status_code == 401


def test_quiz_submit_requires_auth(client):
    r = client.post("/api/quiz/submit", json={"questions": VALID_QUESTIONS, "answers": [0, 0, 0, 0, 0]})
    assert r.status_code == 401


def test_leaderboard_is_public(client):
    with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
        r = client.get("/api/quiz/leaderboard")
    assert r.status_code == 200
    assert "leaderboard" in r.json()


# ─── Generation ───────────────────────────────────────────────────────────────

def test_quiz_generate_ai_path(client):
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()), \
             patch("routers.quiz.get_model", return_value=_mock_model(VALID_QUESTIONS)):
            r = client.post("/api/quiz/generate")
        assert r.status_code == 200
        data = r.json()
        assert data["source"] == "ai"
        assert len(data["questions"]) == 5
    finally:
        app.dependency_overrides.clear()


def test_quiz_generate_falls_back_on_bad_ai_response(client):
    """If AI returns fewer than 5 questions, fallback to static bank."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()), \
             patch("routers.quiz.get_model", return_value=_mock_model([VALID_QUESTIONS[0]])):
            r = client.post("/api/quiz/generate")
        assert r.status_code == 200
        assert r.json()["source"] == "fallback"
    finally:
        app.dependency_overrides.clear()


# ─── _validate_questions ──────────────────────────────────────────────────────

def test_validate_questions_drops_malformed():
    from routers.quiz import _validate_questions

    bad = [
        {"question": "", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": ""},  # empty question
        {"question": "Q?", "options": ["A", "B", "C"], "correct": 0, "explanation": ""},  # only 3 options
        {"question": "Q?", "options": ["A", "B", "C", "D"], "correct": 5, "explanation": ""},  # out-of-range
        {"question": "Q?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": ""},  # valid
    ]
    result = _validate_questions(bad)
    assert len(result) == 1
    assert result[0]["question"] == "Q?"


def test_validate_questions_raises_if_none_valid():
    from routers.quiz import _validate_questions

    with pytest.raises(ValueError, match="No valid questions"):
        _validate_questions([{"bad": "data"}])


def test_validate_questions_correct_index_boundaries():
    from routers.quiz import _validate_questions

    # correct=0 and correct=3 are both valid
    edge = [
        {"question": "Q1?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": ""},
        {"question": "Q2?", "options": ["A", "B", "C", "D"], "correct": 3, "explanation": ""},
    ]
    result = _validate_questions(edge)
    assert len(result) == 2


# ─── Scoring logic ────────────────────────────────────────────────────────────

def test_quiz_submit_scores_correctly(client):
    """All correct answers → 100%, Election Expert badge."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    all_correct = [q["correct"] for q in TEN_QUESTIONS]
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
            r = client.post(
                "/api/quiz/submit",
                json={"questions": TEN_QUESTIONS, "answers": all_correct},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 100
        assert data["correct"] == 10
        assert data["total"] == 10
        assert "Election Expert" in data["badge"]
    finally:
        app.dependency_overrides.clear()


def test_quiz_submit_zero_score(client):
    """All wrong answers → 0%, Getting Started badge."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    # All answers are 3, but correct index is 0 for every question in VALID_QUESTIONS
    all_wrong = [3] * len(VALID_QUESTIONS)
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
            r = client.post(
                "/api/quiz/submit",
                json={"questions": VALID_QUESTIONS, "answers": all_wrong},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 0
        assert data["correct"] == 0
        assert "Getting Started" in data["badge"]
    finally:
        app.dependency_overrides.clear()


def test_quiz_submit_partial_score(client):
    """Half correct answers on 10 questions → 50%, Informed Voter badge."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    # TEN_QUESTIONS[i].correct == i % 4; send correct for first 5, wrong for last 5
    answers = [q["correct"] for q in TEN_QUESTIONS[:5]] + [99] * 5
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
            r = client.post(
                "/api/quiz/submit",
                json={"questions": TEN_QUESTIONS, "answers": answers},
            )
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 50
        assert "Informed Voter" in data["badge"]
    finally:
        app.dependency_overrides.clear()


def test_quiz_submit_answers_exceed_questions_returns_422(client):
    """More answers than questions must be rejected with 422."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
            r = client.post(
                "/api/quiz/submit",
                json={"questions": VALID_QUESTIONS, "answers": [0] * 10},  # 10 > 5
            )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_quiz_submit_no_questions_returns_400(client):
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
            r = client.post(
                "/api/quiz/submit",
                json={"questions": [], "answers": []},
            )
        assert r.status_code == 400
    finally:
        app.dependency_overrides.clear()


def test_quiz_submit_fewer_answers_than_questions(client):
    """Fewer answers than questions is allowed — unanswered questions score 0."""
    app.dependency_overrides[verify_session] = lambda: "test-uid"
    try:
        with patch("routers.quiz.get_supabase", return_value=_mock_sb()):
            r = client.post(
                "/api/quiz/submit",
                json={"questions": VALID_QUESTIONS, "answers": [0]},  # only 1 of 5
            )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 5
        assert data["correct"] == 1  # only first question answered correctly
    finally:
        app.dependency_overrides.clear()
