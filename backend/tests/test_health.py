def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_chat_starters(client):
    r = client.get("/api/chat/starters")
    assert r.status_code == 200
    data = r.json()
    assert "prompts" in data
    assert len(data["prompts"]) == 6


def test_faq(client):
    r = client.get("/api/chat/faq")
    assert r.status_code == 200
    data = r.json()
    assert "categories" in data
    assert len(data["categories"]) >= 3
