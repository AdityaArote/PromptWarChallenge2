from typing import Optional

from pydantic import BaseModel


class ChecklistItemModel(BaseModel):
    id: str
    session_id: str
    item_id: str
    label: str
    completed: bool
    completed_at: Optional[str] = None


class ToggleRequest(BaseModel):
    completed: bool
