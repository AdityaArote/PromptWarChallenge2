import os
from functools import lru_cache
from typing import Optional

from fastapi import Header, HTTPException

from supabase import Client, create_client


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
    try:
        client = get_supabase()
        user = client.auth.get_user(token)
        uid = user.user.id
        # Ensure session exists in public.sessions to satisfy foreign key constraints
        client.table("sessions").upsert({"id": uid}).execute()
        return uid
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
