import { useState, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { MapPin, Navigation } from 'lucide-react'

interface BoothResult {
  name: string; address: string; lat: number; lng: number
  distance: string; place_id: string
}

export function Maps() {
  const [results, setResults] = useState<BoothResult[]>([])
  const [center, setCenter] = useState({ lat: -33.8688, lng: 151.2093 }) // Sydney default
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchNearby = useCallback(async (lat: number, lng: number) => {
    setLoading(true); setError('')
    try {
      // Use Places Text Search via backend proxy (key stays server-side)
      const res = await fetch(`/api/maps/search?lat=${lat}&lng=${lng}`)
      const data = await res.json()
      setResults(data.places || [])
      setCenter({ lat, lng })
    } catch { setError('Could not find polling booths. Try a manual address.') }
    finally { setLoading(false) }
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by your browser.'); return }
    navigator.geolocation.getCurrentPosition(
      p => searchNearby(p.coords.latitude, p.coords.longitude),
      () => setError('Location access denied. Enter an address below.')
    )
  }

  const searchAddress = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(query)}`)
      const d = await res.json()
      if (d.lat) await searchNearby(d.lat, d.lng)
      else setError('Address not found. Try a different search.')
    } catch { setError('Geocoding failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Find Your Polling Booth</h1>
      <p className="text-gray-600 mb-6">Use your location or enter an address to find nearby voting centres.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={useMyLocation}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm hover:bg-gray-50"
          aria-label="Use my current location">
          <Navigation size={16} /> Use my location
        </button>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchAddress()}
          placeholder="Or enter suburb / address..."
          aria-label="Enter address to search"
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
        <button onClick={searchAddress} disabled={loading}
          className="px-4 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-40"
          style={{ background: '#1a4e8a' }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p role="alert" className="text-red-600 text-sm mb-4">{error}</p>}


      <APIProvider apiKey={import.meta.env.VITE_MAPS_API_KEY}>
        <div className="rounded-2xl overflow-hidden border border-gray-200 mb-4" style={{ height: 340 }}>
          <Map
            defaultCenter={center} center={center} defaultZoom={13}
            mapId="electiq-map"
            role="application" aria-label="Map showing polling booth locations"
          >
            {results.map((r) => (
              <AdvancedMarker key={r.place_id} position={{ lat: r.lat, lng: r.lng }} title={r.name}>
                <Pin background="#1a4e8a" glyphColor="#fff" borderColor="#0f3060" />
              </AdvancedMarker>
            ))}
          </Map>
        </div>
      </APIProvider>

      {/* List view — primary for screen readers */}
      <div role="list" aria-label="Polling booth results">
        {results.length === 0 && !loading && (
          <p className="text-gray-500 text-sm text-center py-4">Search above to find polling booths near you.</p>
        )}
        {results.map((r) => (
          <div key={r.place_id} role="listitem"
            className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-200 mb-2">
            <MapPin size={20} className="text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.address}</p>
              {r.distance && <p className="text-xs text-gray-400 mt-0.5">{r.distance} away</p>}
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline shrink-0"
              aria-label={`Get directions to ${r.name}`}>
              Directions
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
