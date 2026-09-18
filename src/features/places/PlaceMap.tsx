import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/place'

export type LatLng = { lat: number; lng: number }

/** 등록된 장소가 없을 때 처음 보여줄 곳 (서울시청) */
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 }
const DEFAULT_ZOOM = 12
/** 장소를 골랐을 때 최소 이 정도로 확대 */
const FOCUS_ZOOM = 16

type Props = {
  places: Place[]
  selectedId: string | null
  onSelect: (placeId: string) => void
  /** 위치 찍기 중이면 지도를 누를 때 좌표를 넘긴다 */
  picking: boolean
  onPick: (point: LatLng) => void
  /** 방금 찍은(아직 저장 안 한) 위치 */
  draft: LatLng | null
  className?: string
}

const pinIcon = (variant: 'normal' | 'active' | 'draft') =>
  L.divIcon({
    // 기본 흰 상자 스타일을 없앤다
    className: '',
    html: `<div class="place-pin place-pin-${variant}"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 30],
  })

/**
 * OpenStreetMap 지도 (Leaflet). API 키가 필요 없다.
 * React 상태와 Leaflet 객체를 ref 로 이어 붙이는 얇은 래퍼.
 */
export function PlaceMap({ places, selectedId, onSelect, picking, onPick, draft, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const draftRef = useRef<L.Marker | null>(null)
  const fittedRef = useRef(false)
  // Leaflet 이벤트 안에서 최신 콜백을 부르기 위해 ref 로 들고 있는다
  const callbacks = useRef({ onSelect, onPick, picking })
  useEffect(() => {
    callbacks.current = { onSelect, onPick, picking }
  })

  // 지도 만들기 (한 번)
  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (callbacks.current.picking) callbacks.current.onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    })
    markersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current = null
      draftRef.current = null
    }
  }, [])

  // 장소 핀 다시 그리기
  useEffect(() => {
    const layer = markersRef.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()
    for (const place of places) {
      L.marker([place.lat, place.lng], {
        icon: pinIcon(place.id === selectedId ? 'active' : 'normal'),
        title: place.name,
        zIndexOffset: place.id === selectedId ? 1000 : 0,
      })
        .on('click', () => callbacks.current.onSelect(place.id))
        .addTo(layer)
    }
    // 처음 불러왔을 때만 모든 핀이 보이게 맞춘다
    if (!fittedRef.current && places.length > 0 && !selectedId) {
      fittedRef.current = true
      map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 })
    }
  }, [places, selectedId])

  // 고른 장소로 이동
  useEffect(() => {
    const map = mapRef.current
    const place = places.find((p) => p.id === selectedId)
    if (!map || !place) return
    fittedRef.current = true
    map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.5 })
  }, [selectedId, places])

  // 찍은 위치 임시 핀
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    draftRef.current?.remove()
    draftRef.current = draft ? L.marker([draft.lat, draft.lng], { icon: pinIcon('draft') }).addTo(map) : null
  }, [draft])

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error('이 브라우저에서는 위치를 알 수 없어요')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], FOCUS_ZOOM, { duration: 0.5 }),
      () => toast.error('위치 권한을 허용해 주세요'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    // isolate: Leaflet 내부의 큰 z-index 가 헤더·하단 탭·팝업 위로 올라오지 않게 가둔다
    <div className={cn('relative isolate overflow-hidden rounded-xl border', className)}>
      <div ref={containerRef} className={cn('size-full', picking && 'cursor-crosshair [&_.leaflet-grab]:cursor-crosshair')} />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={locateMe}
        aria-label="내 위치로"
        className="absolute right-3 bottom-6 z-[1000] shadow-md"
      >
        <LocateFixed className="size-4" />
      </Button>
    </div>
  )
}
