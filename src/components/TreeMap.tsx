'use client'

import { useEffect, useRef } from 'react'
import type { Tree } from '@/lib/supabase'
import { MAP_CONFIG } from '@/lib/constants'

type Props = {
  trees: Tree[]
  filterZone?: string
}

function injectLeafletCSS() {
  const links = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  ]
  links.forEach(href => {
    if (document.querySelector(`link[href="${href}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  })
}

// Loads leaflet + leaflet.markercluster exactly once per page session and
// caches the resulting mutable L object. leaflet.markercluster's UMD bundle
// patches whatever `window.L` happens to be current when its module body
// runs; without this cache, React Strict Mode's dev-only double effect
// invocation starts two overlapping loads that race on that global.
let leafletLoadPromise: Promise<any> | null = null
function loadLeaflet() {
  if (!leafletLoadPromise) {
    leafletLoadPromise = import('leaflet').then(async (Lmodule) => {
      // The ES module namespace object is frozen, so the plugin can't
      // attach markerClusterGroup onto it directly — use a mutable copy.
      const L: any = { ...Lmodule }
      ;(window as any).L = L
      await import('leaflet.markercluster')
      return L
    })
  }
  return leafletLoadPromise
}

export default function TreeMap({ trees, filterZone }: Props) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)
  const clusterRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return
    let cancelled = false

    injectLeafletCSS()

    loadLeaflet().then((L) => {
      // Bail out if this effect run was already cleaned up (Strict Mode's
      // mount → cleanup → mount) or another run already built the map.
      if (cancelled || !mapRef.current || leafletRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

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

      leafletRef.current = { map, L }
      renderClusters(L, map, trees)
    })

    return () => {
      cancelled = true
      if (leafletRef.current) {
        leafletRef.current.map.remove()
        leafletRef.current = null
        clusterRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!leafletRef.current) return
    const { L, map } = leafletRef.current
    const data = filterZone ? trees.filter(t => t.zone === filterZone) : trees
    renderClusters(L, map, data)
  }, [trees, filterZone])

  function renderClusters(L: any, map: any, data: Tree[]) {
    if (clusterRef.current) map.removeLayer(clusterRef.current)

    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      iconCreateFunction: (c: any) => {
        const n   = c.getChildCount()
        const sz  = n > 200 ? 52 : n > 50 ? 42 : 32
        const col = n > 200 ? '#378ADD' : n > 50 ? '#1D9E75' : '#5DCAA5'
        return L.divIcon({
          html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${col};border:2px solid rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${sz > 42 ? 14 : 12}px;font-family:sans-serif;">${n}</div>`,
          className: '',
          iconSize: [sz, sz],
        })
      },
    })

    data.forEach(tree => {
      const color = tree.status === 'verified' ? '#1D9E75' : '#EF9F27'
      const marker = L.circleMarker([tree.latitude, tree.longitude], {
        radius: 7, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 0.9,
      })
      marker.bindPopup(`
        <div style="font-size:13px;min-width:170px;font-family:sans-serif;line-height:1.6">
          <strong>${tree.tree_name}</strong><br/>
          <span style="color:#555">${tree.volunteer_name || tree.department}</span><br/>
          <span style="color:#777;font-size:11px">${tree.zone}</span><br/>
          <span style="color:${color};font-weight:600;font-size:11px">${tree.status === 'verified' ? '✓ যাচাইকৃত' : '⏳ অপেক্ষমাণ'}</span><br/>
          <span style="font-family:monospace;font-size:10px;color:#999">${tree.tree_code}</span>
        </div>
      `)
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    clusterRef.current = cluster
  }

  return <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />
}
