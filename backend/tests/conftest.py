import os
import sys
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # This is backend/
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)  # This is root/
DUMMY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", DUMMY_JWT)
os.environ.setdefault("SUPABASE_ANON_KEY", DUMMY_JWT)
os.environ.setdefault("VERTEX_AI_PROJECT", "test-project")
os.environ.setdefault("VERTEX_AI_LOCATION", "us-central1")


@pytest.fixture
def client():
    with patch("services.rag.init_rag"):
        from main import app

        return TestClient(app)


@pytest.fixture
def auth_headers():
    """Mock a verified session."""
    return {"Authorization": "Bearer test-token"}
