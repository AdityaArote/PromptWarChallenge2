import bleach


def sanitise(text: str, max_len: int = 1000) -> str:
    """Strip HTML/script tags and truncate before forwarding to AI."""
    cleaned = bleach.clean(text, tags=[], strip=True)
    return cleaned[:max_len].strip()
