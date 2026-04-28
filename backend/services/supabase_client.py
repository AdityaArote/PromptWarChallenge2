import logging
import os
from functools import lru_cache
from typing import Optional

from fastapi import Header, HTTPException

from supabase import Client, create_client

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


async def verify_session(authorization: Optional[str] = Header(None)) -> str:
    """Verify Supabase JWT and return user_id (session_id)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    # Guard against "Bearer " with no actual token
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token must not be empty")

    try:
        client = get_supabase()
        user = client.auth.get_user(token)
        uid = user.user.id
        return uid
    except HTTPException:
        raise
    except Exception:
        logger.exception("[Auth] Session verification failed")
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
