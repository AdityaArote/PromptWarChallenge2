from services.sanitise import sanitise


def test_strips_html():
    assert sanitise("<script>alert('xss')</script>Hello") == "alert('xss')Hello"


def test_truncates():
    assert len(sanitise("x" * 2000, max_len=100)) == 100


def test_empty():
    assert sanitise("") == ""


def test_clean_text_unchanged():
    result = sanitise("How do I register to vote?")
    assert result == "How do I register to vote?"
