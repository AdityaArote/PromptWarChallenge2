import re

import bleach

# Control characters: 0x00–0x1F excluding tab (0x09), newline (0x0A), carriage return (0x0D)
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitise(text: str, max_len: int = 1000) -> str:
    """Strip HTML/script tags, control characters, and truncate before forwarding to AI."""
    # 1. Strip HTML tags
    cleaned = bleach.clean(text, tags=[], strip=True)
    # 2. Remove dangerous control characters (keep tab, LF, CR)
    cleaned = _CONTROL_CHARS_RE.sub("", cleaned)
    # 3. Collapse excessive whitespace
    cleaned = cleaned.strip()
    # 4. Enforce length cap
    return cleaned[:max_len]
