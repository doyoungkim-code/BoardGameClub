import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { loadKakaoMaps, type KakaoCafe } from '@/lib/kakaoMap'
import { cn } from '@/lib/utils'
import type { Place } from '@/types/place'

export type LatLng = { lat: number; lng: number }

/** 즐겨찾기가 없을 때 처음 보여줄 곳 (강남역) */
const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 }
/** 카카오맵 level 은 작을수록 확대 */
const DEFAULT_LEVEL = 5
/** 카페를 고르거나 지역으로 이동할 때 이 정도로 확대 */
const FOCUS_LEVEL = 4
/** 지도를 옮긴 뒤 잠깐 멈추면 그때 검색한다 (계속 끌 때마다 검색하지 않게) */
const IDLE_DELAY = 300

type Props = {
  /** 지금 보이는 영역에서 찾은 보드게임카페 */
  cafes: KakaoCafe[]
  /** 오너 즐겨찾기 (항상 표시) */
  favorites: Place[]
  selected: { id: string; lat: number; lng: number } | null
  onSelect: (id: string) => void
  /** 지도 이동·확대가 끝났을 때 (이 영역으로 다시 검색하라는 뜻) */
  onIdle: (bounds: kakao.maps.LatLngBounds, level: number) => void
  /** 이 위치로 옮겨 달라는 요청 (지역 검색). nonce 가 바뀔 때마다 이동 */
  focus: (LatLng & { nonce: number }) | null
  className?: string
}

type PinVariant = 'normal' | 'favorite' | 'active'

/** 지도 핀 (모양은 index.css 의 .place-pin) */
function pinElement(variant: PinVariant, label: string, onClick: () => void) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `place-pin place-pin-${variant}`
  el.title = label
  el.setAttribute('aria-label', label)
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onClick()
  })
  return el
}

/**
 * 카카오맵. React 상태와 카카오맵 객체를 ref 로 이어 붙이는 얇은 래퍼.
 * SDK 는 이 컴포넌트가 처음 그려질 때 불러온다 (lib/kakaoMap.ts).
 */
export function PlaceMap({ cafes, favorites, selected, onSelect, onIdle, focus, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const pinsRef = useRef<kakao.maps.CustomOverlay[]>([])
  const fittedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // selected 객체는 렌더마다 새로 만들어지므로 값으로 풀어서 비교한다
  const selId = selected?.id
  const selLat = selected?.lat
  const selLng = selected?.lng
  // 카카오맵 이벤트 안에서 최신 콜백을 부르기 위해 ref 로 들고 있는다
  const callbacks = useRef({ onSelect, onIdle })
  useEffect(() => {
    callbacks.current = { onSelect, onIdle }
  })

  // 지도 만들기 (한 번)
  useEffect(() => {
    let canceled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    loadKakaoMaps()
      .then((k) => {
        if (canceled || !containerRef.current) return
        const map = new k.maps.Map(containerRef.current, {
          center: new k.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: DEFAULT_LEVEL,
        })
        map.addControl(new k.maps.ZoomControl(), k.maps.ControlPosition.RIGHT)
        const reportIdle = () => callbacks.current.onIdle(map.getBounds(), map.getLevel())
        k.maps.event.addListener(map, 'idle', () => {
          clearTimeout(timer)
          timer = setTimeout(reportIdle, IDLE_DELAY)
        })
        mapRef.current = map
        setStatus('ready')
        reportIdle()
      })
      .catch((error) => {
        console.error('카카오맵 불러오기 실패', error)
        if (!canceled) setStatus('error')
      })
    return () => {
      canceled = true
      clearTimeout(timer)
      mapRef.current = null
    }
  }, [])

  // 핀 다시 그리기: 즐겨찾기 + (즐겨찾기가 아닌) 주변 카페
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    const k = window.kakao
    const favoriteIds = new Set(favorites.map((f) => f.id))
    const spots = [
      ...favorites.map((f) => ({ ...f, favorite: true })),
      ...cafes.filter((c) => !favoriteIds.has(c.id)).map((c) => ({ ...c, favorite: false })),
    ]
    pinsRef.current.forEach((pin) => pin.setMap(null))
    pinsRef.current = spots.map((spot) => {
      const active = spot.id === selId
      return new k.maps.CustomOverlay({
        map,
        position: new k.maps.LatLng(spot.lat, spot.lng),
        content: pinElement(active ? 'active' : spot.favorite ? 'favorite' : 'normal', spot.name, () =>
          callbacks.current.onSelect(spot.id),
        ),
        yAnchor: 1,
        // 고른 것 > 즐겨찾기 > 일반 순으로 위에 그린다
        zIndex: active ? 30 : spot.favorite ? 20 : 10,
        clickable: true,
      })
    })
  }, [cafes, favorites, selId, status])

  // 처음 한 번: 즐겨찾기가 있으면 모두 보이게 맞춘다
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map || fittedRef.current || favorites.length === 0 || selId) return
    fittedRef.current = true
    const k = window.kakao
    const bounds = new k.maps.LatLngBounds()
    favorites.forEach((f) => bounds.extend(new k.maps.LatLng(f.lat, f.lng)))
    map.setBounds(bounds, 60, 60, 60, 60)
    if (map.getLevel() < FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL)
  }, [favorites, selId, status])

  // 고른 카페로 이동
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map || selLat === undefined || selLng === undefined) return
    fittedRef.current = true
    if (map.getLevel() > FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL)
    map.panTo(new window.kakao.maps.LatLng(selLat, selLng))
  }, [selId, selLat, selLng, status])

  // 지역 검색으로 이동
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map || !focus) return
    fittedRef.current = true
    map.setLevel(FOCUS_LEVEL)
    map.setCenter(new window.kakao.maps.LatLng(focus.lat, focus.lng))
  }, [focus, status])

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error('이 브라우저에서는 위치를 알 수 없어요')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        fittedRef.current = true
        map.setLevel(FOCUS_LEVEL)
        map.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
      },
      () => toast.error('위치 권한을 허용해 주세요'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    // isolate: 지도 안의 z-index 가 헤더·하단 탭·팝업 위로 올라오지 않게 가둔다
    <div className={cn('relative isolate overflow-hidden rounded-xl border bg-muted', className)}>
      <div ref={containerRef} className="size-full" />
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
