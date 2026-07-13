'use client'

import { useEffect, useRef } from 'react'
import { MAP_CONFIG } from '@/lib/constants'

type Props = {
  onChange: (lat: string, lng: string) => void
}

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

export default function LocationPicker({ onChange }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const leafletRef  = useRef<any>(null)
  const markerRef   = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    let cancelled = false

    injectLeafletCSS()

    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || leafletRef.current) return

      const map = L.map(mapRef.current, {
        center:  MAP_CONFIG.center,
        zoom:    MAP_CONFIG.zoom,
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

      leafletRef.current = { map, L }
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

  return <div ref={mapRef} style={{ height: 280, width: '100%', borderRadius: 8 }} />
}
