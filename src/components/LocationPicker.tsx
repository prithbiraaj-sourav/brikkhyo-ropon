'use client'

import { useEffect, useRef, useState } from 'react'
import { MAP_CONFIG } from '@/lib/constants'

type Props = {
  latitude: string
  longitude: string
  onChange: (lat: string, lng: string) => void
}

type SearchResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

// Default view for the picker map: Shariatpur Sadar town, closer zoom than
// the overview MAP_CONFIG.zoom (12) used by TreeMap since this map is for
// pinpointing a single plantation spot, not surveying the whole upazila.
const DEFAULT_CENTER: [number, number] = [23.2170, 90.3500]
const DEFAULT_ZOOM = 13

function injectLeafletCSS() {
  const href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

// Loads leaflet exactly once per page session, mirroring the pattern in
// TreeMap.tsx: the ES module namespace object is frozen, so hand callers a
// mutable copy instead. Kept separate from TreeMap's loader (which also
// pulls in leaflet.markercluster) since this component never needs clustering.
let leafletLoadPromise: Promise<any> | null = null
function loadLeaflet() {
  if (!leafletLoadPromise) {
    leafletLoadPromise = import('leaflet').then((Lmodule) => {
      const L: any = { ...Lmodule }
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      return L
    })
  }
  return leafletLoadPromise
}

export default function LocationPicker({ latitude, longitude, onChange }: Props) {
  const mapRef       = useRef<HTMLDivElement>(null)
  const leafletRef   = useRef<any>(null)
  const markerRef    = useRef<any>(null)
  const onChangeRef  = useRef(onChange)
  onChangeRef.current = onChange

  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<SearchResult[]>([])
  const [searching, setSearching]     = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    let cancelled = false

    injectLeafletCSS()

    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || leafletRef.current) return

      const map = L.map(mapRef.current, {
        center:  DEFAULT_CENTER,
        zoom:    DEFAULT_ZOOM,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      const placeMarker = (lat: number, lng: number) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', () => {
            const pos = markerRef.current.getLatLng()
            onChangeRef.current(pos.lat.toFixed(6), pos.lng.toFixed(6))
          })
        }
        onChangeRef.current(lat.toFixed(6), lng.toFixed(6))
      }

      map.on('click', (e: any) => placeMarker(e.latlng.lat, e.latlng.lng))

      leafletRef.current = { map, L, placeMarker }
    })

    return () => {
      cancelled = true
      if (leafletRef.current) {
        leafletRef.current.map.remove()
        leafletRef.current = null
        markerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced place search against Nominatim, boxed to Shariatpur Sadar so
  // stray results outside the working area don't show up.
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=90.10,23.05,90.35,23.30&bounded=1&countrycodes=bd`
        const res = await fetch(url, { headers: { 'Accept-Language': 'bn' } })
        const data: SearchResult[] = await res.json()
        setResults(data)
        setShowResults(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function selectResult(r: SearchResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    setQuery(r.display_name)
    setShowResults(false)
    setResults([])
    if (leafletRef.current) {
      leafletRef.current.map.flyTo([lat, lng], 16)
      leafletRef.current.placeMarker(lat, lng)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          className="input text-sm"
          placeholder="স্থান খুঁজুন (যেমনঃ পালং বাজার)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
        />
        {searching && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">খুঁজছে…</span>
        )}
        {showResults && results.length > 0 && (
          <ul className="absolute z-[1000] left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
            {results.map(r => (
              <li key={r.place_id}
                className="px-3 py-2 hover:bg-forest-50 cursor-pointer border-b border-gray-100 last:border-0"
                onMouseDown={() => selectResult(r)}>
                {r.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={mapRef} style={{ height: 300, width: '100%', borderRadius: 8 }} />

      <p className="text-xs text-gray-500">
        {latitude && longitude ? `পিন অবস্থান: ${latitude}, ${longitude}` : 'ম্যাপে ট্যাপ করুন অথবা উপরে স্থান খুঁজে পিন বসান'}
      </p>
    </div>
  )
}
