import logging
import os

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/maps", tags=["maps"])
logger = logging.getLogger(__name__)


def get_maps_key() -> str:
    return os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")


@router.get("/search")
async def search_booths(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in [-90, 90]"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in [-180, 180]"),
):
    """Proxy Places Text Search — keeps API key server-side."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(
                "https://places.googleapis.com/v1/places:searchText",
                json={
                    "textQuery": "polling station voting centre",
                    "locationBias": {
                        "circle": {
                            "center": {"latitude": lat, "longitude": lng},
                            "radius": 10000.0,
                        }
                    },
                },
                headers={
                    "X-Goog-Api-Key": get_maps_key(),
                    "X-Goog-FieldMask": (
                        "places.displayName,places.formattedAddress,"
                        "places.location,places.id"
                    ),
                },
            )
            r.raise_for_status()
        except httpx.TimeoutException:
            logger.error("[Maps] Places API timed out for lat=%s lng=%s", lat, lng)
            raise HTTPException(status_code=504, detail="Maps service timed out")
        except httpx.HTTPStatusError as exc:
            logger.error("[Maps] Places API HTTP %s: %s", exc.response.status_code, exc.response.text)
            raise HTTPException(status_code=502, detail="Upstream maps service error")

        data = r.json()
        if "error" in data:
            logger.error("[Maps] Places API error payload: %s", data["error"])
            raise HTTPException(status_code=502, detail="Maps service returned an error")

        places = []
        for p in data.get("places", [])[:5]:
            loc = p.get("location", {})
            places.append(
                {
                    "name": p.get("displayName", {}).get("text", "Polling Centre"),
                    "address": p.get("formattedAddress", ""),
                    "lat": loc.get("latitude", lat),
                    "lng": loc.get("longitude", lng),
                    "place_id": p.get("id", ""),
                    "distance": "",
                }
            )
        return {"places": places}


@router.get("/geocode")
async def geocode(address: str = Query(..., min_length=2, max_length=200)):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": address, "key": get_maps_key()},
            )
            r.raise_for_status()
        except httpx.TimeoutException:
            logger.error("[Maps] Geocoding API timed out for address=%r", address)
            raise HTTPException(status_code=504, detail="Geocoding service timed out")
        except httpx.HTTPStatusError as exc:
            logger.error("[Maps] Geocoding HTTP %s", exc.response.status_code)
            raise HTTPException(status_code=502, detail="Geocoding service error")

        data = r.json()
        status = data.get("status")
        if status != "OK":
            logger.warning("[Maps] Geocoding status=%s for address=%r", status, address)
            if status == "ZERO_RESULTS":
                return {"error": "not found"}
            raise HTTPException(status_code=502, detail="Geocoding service error")

        loc = data["results"][0]["geometry"]["location"]
        return {"lat": loc["lat"], "lng": loc["lng"]}
