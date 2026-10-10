import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Leaflet + OSM: tıklayarak konum, sürükleyerek araç yönü (ok) seçimi. */
export function KonumSecici({ konum, headings, sunAzimuth, onKonum, onHeading }: { konum?: { lat: number; lon: number }; headings: (number | undefined)[]; sunAzimuth?: number; onKonum: (lat: number, lon: number) => void; onHeading: (i: number, h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  useEffect(() => {
    if (!ref.current || map.current) return
    map.current = L.map(ref.current, { center: [konum?.lat ?? 39.0, konum?.lon ?? 35.0], zoom: konum ? 15 : 6 })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    map.current.on('click', (e: L.LeafletMouseEvent) => onKonum(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)))
    return () => { map.current?.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    const m = map.current, g = layer.current
    if (!m || !g) return
    g.clearLayers()
    if (!konum) return
    const p = L.latLng(konum.lat, konum.lon)
    L.circleMarker(p, { radius: 7, color: '#0E2A47', fillColor: '#1FA9D6', fillOpacity: 0.9 }).addTo(g).bindTooltip('Kaza yeri')
    const dest = (deg: number, dist: number) => { const d = dist / 111320; const r = (deg * Math.PI) / 180; return L.latLng(p.lat + d * Math.cos(r), p.lng + (d * Math.sin(r)) / Math.cos((p.lat * Math.PI) / 180)) }
    headings.forEach((h, i) => {
      if (h === undefined) return
      const e = dest(h, 120)
      L.polyline([p, e], { color: i === 0 ? '#C9A24A' : '#4A3426', weight: 4 }).addTo(g).bindTooltip(`${i + 1}. Araç heading ${h}°`)
      const mk = L.marker(e, { draggable: true, icon: L.divIcon({ className: '', html: `<div style="background:${i === 0 ? '#C9A24A' : '#4A3426'};color:#fff;border-radius:999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font:600 11px Inter">${i + 1}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(g)
      mk.on('dragend', () => { const q = mk.getLatLng(); const dy = q.lat - p.lat; const dx = (q.lng - p.lng) * Math.cos((p.lat * Math.PI) / 180); onHeading(i, Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360)) })
    })
    if (sunAzimuth !== undefined) L.polyline([p, dest(sunAzimuth, 200)], { color: '#f59e0b', weight: 2, dashArray: '6 6' }).addTo(g).bindTooltip(`Güneş azimut ${sunAzimuth.toFixed(1)}°`)
    if (m.getZoom() < 10) m.setView(p, 15)
  }, [konum, headings, sunAzimuth])
  return <div ref={ref} className="h-80 w-full rounded-lg border border-krem-200" />
}
