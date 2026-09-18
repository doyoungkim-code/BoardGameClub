import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { loadKakaoMaps } from '@/lib/kakaoMap'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/place'

export type LatLng = { lat: number; lng: number }

/** 등록된 장소가 없을 때 처음 보여줄 곳 (서울시청) */
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 }
/** 카카오맵 level 은 작을수록 확대. 서울 시내가 한눈에 보이는 정도 */
const DEFAULT_LEVEL = 8
/** 장소를 골랐을 때 이 정도까지 확대 */
const FOCUS_LEVEL = 3

type Props = {
  places: Place[]
  selectedId: string | null
  onSelect: (placeId: string) => void
  /** 위치 찍기 중이면 지도를 누를 때 좌표를 넘긴다 */
  picking: boolean
  onPick: (point: LatLng) => void
  /** 방금 찍거나 검색으로 고른(아직 저장 안 한) 위치 */
  draft: LatLng | null
  className?: string
}

type PinVariant = 'normal' | 'active' | 'draft'

/** 지도 핀 (모양은 index.css 의 .place-pin) */
function pinElement(variant: PinVariant, label?: string, onClick?: () => void) {
  const el = document.createElement(onClick ? 'button' : 'div')
  el.className = `place-pin place-pin-${variant}`
  if (label) {
    el.title = label
    el.setAttribute('aria-label', label)
  }
  if (onClick) {
    ;(el as HTMLButtonElement).type = 'button'
    el.addEventListener('click', (e) => {
      // 핀을 눌렀을 때 지도 클릭(위치 찍기)으로 번지지 않게
      e.stopPropagation()
      onClick()
    })
  }
  return el
}

/**
 * 카카오맵. React 상태와 카카오맵 객체를 ref 로 이어 붙이는 얇은 래퍼.
 * SDK 는 이 컴포넌트가 처음 그려질 때 불러온다 (lib/kakaoMap.ts).
 */
export function PlaceMap({ places, selectedId, onSelect, picking, onPick, draft, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const pinsRef = useRef<kakao.maps.CustomOverlay[]>([])
  const draftRef = useRef<kakao.maps.CustomOverlay | null>(null)
  const fittedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // 카카오맵 이벤트 안에서 최신 콜백을 부르기 위해 ref 로 들고 있는다
  const callbacks = useRef({ onSelect, onPick, picking })
  useEffect(() => {
    callbacks.current = { onSelect, onPick, picking }
  })

  // 지도 만들기 (한 번)
  useEffect(() => {
    let canceled = false
    loadKakaoMaps()
      .then((k) => {
        if (canceled || !containerRef.current) return
        const map = new k.maps.Map(containerRef.current, {
          center: new k.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: DEFAULT_LEVEL,
        })
        map.addControl(new k.maps.ZoomControl(), k.maps.ControlPosition.RIGHT)
        k.maps.event.addListener(map, 'click', (e) => {
          if (callbacks.current.picking) callbacks.current.onPick({ lat: e.latLng.getLat(), lng: e.latLng.getLng() })
        })
        mapRef.current = map
        setStatus('ready')
      })
      .catch((error) => {
        console.error('카카오맵 불러오기 실패', error)
        if (!canceled) setStatus('error')
      })
    return () => {
      canceled = true
      mapRef.current = null
    }
  }, [])

  // 장소 핀 다시 그리기
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    const k = window.kakao
    pinsRef.current.forEach((pin) => pin.setMap(null))
    pinsRef.current = places.map(
      (place) =>
        new k.maps.CustomOverlay({
          map,
          position: new k.maps.LatLng(place.lat, place.lng),
          content: pinElement(place.id === selectedId ? 'active' : 'normal', place.name, () =>
            callbacks.current.onSelect(place.id),
          ),
          yAnchor: 1,
          zIndex: place.id === selectedId ? 10 : 1,
          clickable: true,
        }),
    )
    // 처음 불러왔을 때만 모든 핀이 보이게 맞춘다
    if (!fittedRef.current && places.length > 0 && !selectedId) {
      fittedRef.current = true
      const bounds = new k.maps.LatLngBounds()
      places.forEach((p) => bounds.extend(new k.maps.LatLng(p.lat, p.lng)))
      map.setBounds(bounds, 60, 60, 60, 60)
      // 장소가 하나뿐이면 너무 확대되므로 적당히 되돌린다
      if (map.getLevel() < FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL)
    }
  }, [places, selectedId, status])

  // 고른 장소로 이동
  useEffect(() => {
    const map = mapRef.current
    const place = places.find((p) => p.id === selectedId)
    if (status !== 'ready' || !map || !place) return
    fittedRef.current = true
    if (map.getLevel() > FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL)
    map.panTo(new window.kakao.maps.LatLng(place.lat, place.lng))
  }, [selectedId, places, status])

  // 찍거나 검색으로 고른 위치: 임시 핀을 두고 그리로 이동
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    draftRef.current?.setMap(null)
    draftRef.current = null
    if (!draft) return
    const k = window.kakao
    const position = new k.maps.LatLng(draft.lat, draft.lng)
    draftRef.current = new k.maps.CustomOverlay({ map, position, content: pinElement('draft'), yAnchor: 1, zIndex: 20 })
    if (map.getLevel() > FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL)
    map.panTo(position)
  }, [draft, status])

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error('이 브라우저에서는 위치를 알 수 없어요')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        map.setLevel(4)
        map.panTo(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
      },
      () => toast.error('위치 권한을 허용해 주세요'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    // isolate: 지도 안의 z-index 가 헤더·하단 탭·팝업 위로 올라오지 않게 가둔다
    <div className={cn('relative isolate overflow-hidden rounded-xl border bg-muted', className)}>
      <div ref={containerRef} className={cn('size-full', picking && 'cursor-crosshair')} />
      {status === 'loading' && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          지도를 불러오는 중…
        </p>
      )}
      {status === 'error' && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
          지도를 불러오지 못했어요.
          <br />
          광고 차단 확장 프로그램이 켜져 있으면 꺼 주세요.
        </p>
      )}
      {status === 'ready' && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={locateMe}
          aria-label="내 위치로"
          className="absolute bottom-3 left-3 z-10 shadow-md"
        >
          <LocateFixed className="size-4" />
        </Button>
      )}
    </div>
  )
}
