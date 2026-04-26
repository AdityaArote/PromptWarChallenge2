import os
from functools import lru_cache
from typing import Optional

from supabase import create_client, Client
from fastapi import HTTPException, Header


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


async def verify_session(authorization: Optional[str] = Header(None)) -> str:
    """Verify Supabase JWT and return user_id (session_id)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )
    token = authorization.removeprefix("Bearer ").strip()
    try:
        client = get_supabase()
        user = client.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
