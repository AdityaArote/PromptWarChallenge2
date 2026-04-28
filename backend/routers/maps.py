import os

import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/api/maps", tags=["maps"])


def get_maps_key() -> str:
    return os.environ.get("GOOGLE_MAPS_SERVER_KEY", "")


@router.get("/search")
async def search_booths(lat: float, lng: float):
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
                "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.id",
            },
        )
        data = r.json()
        if "error" in data:
            print(f"[Maps Error] Places API: {data['error']}")
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
async def geocode(address: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": get_maps_key()},
        )
        data = r.json()
        if data.get("status") != "OK":
            print(
                f"[Maps Error] Geocoding API Status: {data.get('status')}, Error: {data.get('error_message', 'No message')}"
            )
        results = data.get("results", [])
        if not results:
            return {"error": "not found"}
        loc = results[0]["geometry"]["location"]
        return {"lat": loc["lat"], "lng": loc["lng"]}
