import os

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/maps", tags=["maps"])


def get_maps_key() -> str:
    return os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")


@router.get("/search")
async def search_booths(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in [-90, 90]"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in [-180, 180]"),
):
    """Proxy Places Text Search — keeps API key server-side."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json={
                "textQuery": "polling station voting centre",
                "locationBias": {
                    "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": 10000.0}
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
        data = r.json()
        if "error" in data:
            # Log server-side only — never forward raw API errors to client
            import logging

            logging.getLogger("electiq").error("[Maps] Places API error: %s", data["error"])
            raise HTTPException(status_code=502, detail="Upstream maps service error")

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
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": get_maps_key()},
        )
        data = r.json()
        if data.get("status") != "OK":
            import logging

            logging.getLogger("electiq").warning("[Maps] Geocoding status: %s", data.get("status"))
        results = data.get("results", [])
        if not results:
            return {"error": "not found"}
        loc = results[0]["geometry"]["location"]
        return {"lat": loc["lat"], "lng": loc["lng"]}
