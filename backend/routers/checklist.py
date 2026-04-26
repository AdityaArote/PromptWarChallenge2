from fastapi import APIRouter, Depends
from ..models.checklist import ToggleRequest
from ..services.supabase_client import get_supabase, verify_session
from datetime import datetime, timezone

router = APIRouter(prefix="/api/checklist", tags=["checklist"])

DEFAULT_ITEMS = [
    {"item_id": "check_registration",  "label": "Check your voter registration status"},
    {"item_id": "confirm_booth",       "label": "Confirm your polling booth location"},
    {"item_id": "prepare_id",          "label": "Prepare a valid photo ID"},
    {"item_id": "arrange_transport",   "label": "Arrange transport to the polling booth"},
    {"item_id": "plan_voting_time",    "label": "Plan what time you will vote"},
    {"item_id": "learn_candidates",    "label": "Learn about the candidates and parties"},
    {"item_id": "understand_ballot",   "label": "Understand how to fill in your ballot"},
]


@router.get("")
async def get_checklist(session_id: str = Depends(verify_session)):
    sb = get_supabase()
    result = sb.table("checklist_items").select("*").eq("session_id", session_id).execute()
    items = result.data or []

    if not items:
        # Seed defaults for new session
        rows = [{"session_id": session_id, **d, "completed": False} for d in DEFAULT_ITEMS]
        sb.table("checklist_items").insert(rows).execute()
        items = sb.table("checklist_items").select("*").eq("session_id", session_id).execute().data

    return {"items": items}


@router.put("/{item_id}")
async def toggle_item(
    item_id: str,
    body: ToggleRequest,
    session_id: str = Depends(verify_session),
):
    sb = get_supabase()
    update: dict = {"completed": body.completed}
    if body.completed:
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        update["completed_at"] = None

    sb.table("checklist_items").update(update).eq("session_id", session_id).eq(
        "item_id", item_id
    ).execute()
    return {"status": "ok", "item_id": item_id, "completed": body.completed}
