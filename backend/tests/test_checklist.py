from unittest.mock import MagicMock, patch


def test_checklist_requires_auth(client):
    r = client.get("/api/checklist")
    assert r.status_code == 401


def test_toggle_requires_auth(client):
    r = client.put("/api/checklist/check_registration", json={"completed": True})
    assert r.status_code == 401


def test_checklist_seeds_defaults(client, auth_headers):
    mock_sb = MagicMock()
    mock_execute = MagicMock()
    # First call returns empty, second returns seeded data
    mock_execute.execute.side_effect = [
        MagicMock(data=[]),
        MagicMock(
            data=[
                {
                    "id": "1",
                    "item_id": "check_registration",
                    "label": "Check your voter registration status",
                    "completed": False,
                    "completed_at": None,
                }
            ]
        ),
    ]
    mock_sb.table.return_value.select.return_value.eq.return_value = mock_execute
    mock_sb.table.return_value.insert.return_value.execute.return_value = None

    from main import app
    from services.supabase_client import verify_session

    app.dependency_overrides[verify_session] = lambda: "test-uid"

    with patch("routers.checklist.get_supabase", return_value=mock_sb):
        r = client.get("/api/checklist", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()


def test_toggle_item_completed(client, auth_headers):
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = (
        None
    )

    from main import app
    from services.supabase_client import verify_session

    app.dependency_overrides[verify_session] = lambda: "test-uid"

    with patch("routers.checklist.get_supabase", return_value=mock_sb):
        r = client.put(
            "/api/checklist/check_registration", json={"completed": True}, headers=auth_headers
        )
        assert r.status_code == 200
        assert r.json()["completed"] is True

    app.dependency_overrides.clear()
