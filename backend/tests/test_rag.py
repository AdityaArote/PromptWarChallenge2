from unittest.mock import MagicMock, patch

from services.rag import cache_key, get_top_k, init_rag


def test_cache_key():
    key = cache_key("test claim")
    assert isinstance(key, str)
    assert len(key) == 64  # sha256 length


@patch("vertexai.init")
@patch("vertexai.language_models.TextEmbeddingModel.from_pretrained")
def test_init_rag(mock_from_pretrained, mock_init, monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT", "test-project")

    mock_model = MagicMock()
    # Mock get_embeddings to return objects with a .values attribute
    mock_result = MagicMock()
    mock_result.values = [0.1, 0.2, 0.3]
    mock_model.get_embeddings.return_value = [mock_result] * 2  # Assuming 2 items in fake KB

    # We can mock pathlib.Path.read_text to return a small dummy KB
    dummy_kb = '[{"claim": "Claim 1", "fact": "Fact 1"}, {"claim": "Claim 2", "fact": "Fact 2"}]'

    with patch("services.rag.pathlib.Path.read_text", return_value=dummy_kb):
        mock_from_pretrained.return_value = mock_model
        init_rag()

    mock_init.assert_called_once_with(project="test-project", location="us-central1")
    mock_model.get_embeddings.assert_called_once_with(["Claim 1", "Claim 2"])


@patch("vertexai.init")
@patch("vertexai.language_models.TextEmbeddingModel.from_pretrained")
def test_get_top_k(mock_from_pretrained, mock_init, monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT", "test-project")

    mock_model = MagicMock()
    mock_result = MagicMock()
    mock_result.values = [0.1, 0.2, 0.3]
    mock_model.get_embeddings.return_value = [mock_result]
    mock_from_pretrained.return_value = mock_model

    # We need to set internal state of rag module
    import services.rag as rag

    rag._kb = [{"claim": "Claim 1"}, {"claim": "Claim 2"}]
    rag._embeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]

    top_k = get_top_k("Query claim", k=1)
    assert len(top_k) == 1
    # Both _cosine similarity will give some float
    mock_init.assert_called_once_with(project="test-project", location="us-central1")
    mock_model.get_embeddings.assert_called_once_with(["Query claim"])
