import json
import pathlib
from fastapi import APIRouter

router = APIRouter(prefix="/api/timeline", tags=["timeline"])
_DATA = None


def _load():
    global _DATA
    if _DATA is None:
        p = pathlib.Path(__file__).parent.parent / "data" / "election_phases.json"
        _DATA = json.loads(p.read_text())
    return _DATA


@router.get("")
async def get_timeline(voter_type: str = "first_time"):
    data = _load()
    phases = [p for p in data["phases"] if voter_type in p.get("voter_types", [])]
    return {"phases": phases}
