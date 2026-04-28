import pytest

from services.sanitise import sanitise


# ─── HTML stripping ───────────────────────────────────────────────────────────

def test_strips_script_tag():
    assert sanitise("<script>alert('xss')</script>Hello") == "alert('xss')Hello"


def test_strips_nested_html():
    assert sanitise("<b><i>bold italic</i></b>") == "bold italic"


def test_strips_html_attributes():
    result = sanitise('<a href="http://evil.com">click me</a>')
    assert "href" not in result
    assert "click me" in result


# ─── Control character stripping ──────────────────────────────────────────────

def test_strips_null_byte():
    assert "\x00" not in sanitise("hello\x00world")


def test_strips_all_control_chars():
    # Build a string of every control char 0x00–0x1F (except tab, LF, CR)
    ctrl = "".join(chr(c) for c in range(0x00, 0x20) if c not in (0x09, 0x0A, 0x0D))
    result = sanitise(ctrl + "clean")
    # No control chars should survive
    for ch in result:
        assert ord(ch) >= 0x20 or ch in ("\t", "\n", "\r"), f"Control char survived: {ord(ch):#04x}"
    assert "clean" in result


def test_preserves_tab_lf_cr():
    text = "line1\nline2\tindented\rend"
    result = sanitise(text)
    assert "\n" in result
    assert "\t" in result
    assert "\r" in result


# ─── Unicode preservation ─────────────────────────────────────────────────────

def test_preserves_unicode():
    assert sanitise("Ünïcödé tëxt 日本語 🗳️") == "Ünïcödé tëxt 日本語 🗳️"


def test_preserves_arabic():
    arabic = "كيف أصوت؟"
    assert sanitise(arabic) == arabic


# ─── Whitespace handling ──────────────────────────────────────────────────────

def test_strips_leading_trailing_whitespace():
    assert sanitise("   hello   ") == "hello"


def test_empty_string():
    assert sanitise("") == ""


def test_only_whitespace():
    assert sanitise("   ") == ""


# ─── Truncation ───────────────────────────────────────────────────────────────

def test_truncates_to_max_len():
    result = sanitise("x" * 2000, max_len=100)
    assert len(result) == 100


def test_truncates_unicode_safely():
    # Unicode chars are multi-byte but Python slices by codepoint — should not corrupt
    text = "あ" * 200
    result = sanitise(text, max_len=50)
    assert len(result) == 50
    assert all(c == "あ" for c in result)


def test_clean_text_unchanged():
    plain = "How do I register to vote?"
    assert sanitise(plain) == plain
