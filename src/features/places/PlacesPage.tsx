import { useRef, useState, type FormEvent } from 'react'
import { ExternalLink, MapPin, Navigation, Phone, Search, Star, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PlaceMap, type LatLng } from '@/features/places/PlaceMap'
import { usePlaces } from '@/hooks/usePlaces'
import { toErrorMessage } from '@/lib/format'
import { findArea, searchBoardCafesIn, type KakaoCafe } from '@/lib/kakaoMap'
import { tappableRow } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { addFavorite, kakaoMapUrl, kakaoRouteUrl, removeFavorite, updateFavoriteMemo } from '@/services/places'
import { useAuth, useIsOwner } from '@/stores/auth'
import type { Place } from '@/types/place'

/** 이보다 넓게 보고 있으면(숫자가 클수록 넓음) 카페를 뽑지 않는다. 너무 넓으면 45곳 제한에 걸려 빠지는 곳이 많다 */
const MAX_SEARCH_LEVEL = 7

/** 지도·목록에서 고를 수 있는 한 곳 (카카오 검색 결과 또는 즐겨찾기) */
type Spot = { id: string; name: string; address: string; phone?: string; lat: number; lng: number }

type AreaState = 'loading' | 'ready' | 'tooWide' | 'error'

/**
 * 보드게임카페 지도.
 * - 지도에 보이는 지역의 보드게임카페를 카카오에서 자동으로 뽑아 핀과 목록으로 보여준다
 * - 오너는 다녀온 곳을 즐겨찾기(★)하고 메모를 남긴다. 즐겨찾기는 지역과 상관없이 항상 보인다
 */
export function PlacesPage() {
  const favorites = usePlaces()
  const uid = useAuth((s) => s.profile!.uid)
  const isOwner = useIsOwner()

  const [cafes, setCafes] = useState<KakaoCafe[]>([])
  const [area, setArea] = useState<AreaState>('loading')
  const [truncated, setTruncated] = useState(false)
  const searchSeq = useRef(0)

  const [picked, setPicked] = useState<Spot | null>(null)
  const [focus, setFocus] = useState<(LatLng & { nonce: number }) | null>(null)
  const [areaKeyword, setAreaKeyword] = useState('')

  // 다른 화면에서 /places?place=<즐겨찾기 ID> 로 들어오면 그곳을 먼저 보여준다
  const [searchParams, setSearchParams] = useSearchParams()
  const linkedId = searchParams.get('place')
  const linked = linkedId ? favorites?.find((f) => f.id === linkedId) : undefined
  const selected: Spot | null = picked ?? linked ?? null
  const selectedFavorite = selected ? favorites?.find((f) => f.id === selected.id) : undefined

  const select = (spot: Spot | null) => {
    setPicked(spot)
    if (linkedId) setSearchParams({}, { replace: true })
  }

  const selectById = (id: string) => {
    const spot = favorites?.find((f) => f.id === id) ?? cafes.find((c) => c.id === id)
    if (spot) select(spot)
  }

  // 지도를 옮길 때마다 그 영역의 보드게임카페를 다시 뽑는다. 늦게 온 옛 응답은 버린다
  const handleIdle = (bounds: kakao.maps.LatLngBounds, level: number) => {
    const seq = ++searchSeq.current
    if (level > MAX_SEARCH_LEVEL) {
      setArea('tooWide')
      setCafes([])
      return
    }
    setArea('loading')
    searchBoardCafesIn(bounds)
      .then((result) => {
        if (seq !== searchSeq.current) return
        setCafes(result.cafes)
        setTruncated(result.truncated)
        setArea('ready')
      })
      .catch((error) => {
        console.error('보드게임카페 검색 실패', error)
        if (seq === searchSeq.current) setArea('error')
      })
  }

  const goToArea = async (e: FormEvent) => {
    e.preventDefault()
    const keyword = areaKeyword.trim()
    if (!keyword) return
    try {
      const point = await findArea(keyword)
      if (!point) {
        toast.error(`'${keyword}'을(를) 찾지 못했어요`)
        return
      }
      select(null)
      setFocus({ ...point, nonce: Date.now() })
    } catch (error) {
      console.error('지역 검색 실패', error)
      toast.error('검색하지 못했어요. 잠시 후 다시 해 주세요')
    }
  }

  const favoriteIds = new Set(favorites?.map((f) => f.id))
  const nearby = cafes.filter((c) => !favoriteIds.has(c.id))

  const pickFromList = (spot: Spot) => {
    select(spot)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="보드게임카페 지도" />

      <div className="space-y-3">
        <form onSubmit={goToArea} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={areaKeyword}
              onChange={(e) => setAreaKeyword(e.target.value)}
              placeholder="지역으로 이동 (예: 홍대, 건대입구)"
              aria-label="지역으로 이동"
              className="pl-9"
              enterKeyHint="search"
            />
          </div>
          <Button type="submit" disabled={!areaKeyword.trim()}>
            이동
          </Button>
        </form>

        <PlaceMap
          cafes={cafes}
          favorites={favorites ?? []}
          selected={selected}
          onSelect={selectById}
          onIdle={handleIdle}
          focus={focus}
          className="h-[50dvh] md:h-[60dvh]"
        />

        {selected && (
          <SpotCard
            key={selected.id}
            spot={selected}
            favorite={selectedFavorite}
            isOwner={isOwner}
            uid={uid}
            onClose={() => select(null)}
          />
        )}
      </div>

      {favorites && favorites.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Star className="size-4 fill-primary text-primary" />
            즐겨찾기 {favorites.length}
          </h2>
          <SpotList spots={favorites} selectedId={selected?.id} onPick={pickFromList} favorite />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">
          지도 안의 보드게임카페 {area === 'ready' && nearby.length > 0 && `${nearby.length}곳`}
        </h2>
        {area === 'tooWide' ? (
          <Notice>지도를 조금 더 확대하면 보드게임카페가 나와요</Notice>
        ) : area === 'error' ? (
          <Notice>카페를 불러오지 못했어요. 지도를 살짝 움직여 다시 시도해 주세요</Notice>
        ) : area === 'loading' && cafes.length === 0 ? (
          <Notice>찾는 중…</Notice>
        ) : nearby.length === 0 ? (
          <Notice>이 지역에는 보드게임카페가 없어요</Notice>
        ) : (
          <>
            <SpotList spots={nearby} selectedId={selected?.id} onPick={pickFromList} />
            {truncated && (
              <p className="text-center text-xs text-muted-foreground">이 지역엔 더 있어요. 확대하면 나머지도 나와요</p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function Notice({ children }: { children: string }) {
  return <EmptyState title={children} size="sm" />
}

function SpotList({
  spots,
  selectedId,
  onPick,
  favorite,
}: {
  spots: (Spot | Place)[]
  selectedId?: string
  onPick: (spot: Spot) => void
  favorite?: boolean
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {spots.map((spot) => (
        <li key={spot.id}>
          <button
            type="button"
            onClick={() => onPick(spot)}
            className={cn('flex w-full items-start gap-3 px-4 py-3 text-left', tappableRow, spot.id === selectedId && 'bg-accent')}
          >
            {favorite ? (
              <Star className="mt-0.5 size-4 shrink-0 fill-primary text-primary" />
            ) : (
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{spot.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{spot.address}</span>
              {'memo' in spot && spot.memo && (
                <span className="mt-0.5 block truncate text-xs text-primary">{spot.memo}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

type CardProps = {
  spot: Spot
  /** 즐겨찾기된 곳이면 그 문서 */
  favorite?: Place
  isOwner: boolean
  uid: string
  onClose: () => void
}

function SpotCard({ spot, favorite, isOwner, uid, onClose }: CardProps) {
  const [busy, setBusy] = useState(false)
  const [memo, setMemo] = useState(favorite?.memo ?? '')

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(message)
    } catch (error) {
      console.error('즐겨찾기 처리 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            {spot.name}
            {favorite && (
              <Badge className="gap-1">
                <Star className="size-3 fill-current" />
                즐겨찾기
              </Badge>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{spot.address}</p>
          {spot.phone && (
            <a href={`tel:${spot.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary">
              <Phone className="size-3" />
              {spot.phone}
            </a>
          )}
        </div>
        <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-8" onClick={onClose} aria-label="닫기">
          <X className="size-4" />
        </Button>
      </div>

      {/* 메모: 회원에게는 보이기만, 오너는 고칠 수 있다 */}
      {favorite && !isOwner && favorite.memo && <p className="text-sm whitespace-pre-wrap">{favorite.memo}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={kakaoMapUrl(spot)} target="_blank" rel="noreferrer noopener">
            <ExternalLink className="size-4" />
            카카오맵
          </a>
        </Button>
        <Button asChild size="sm">
          <a href={kakaoRouteUrl(spot)} target="_blank" rel="noreferrer noopener">
            <Navigation className="size-4" />
            길찾기
          </a>
        </Button>
      </div>

      {isOwner &&
        (favorite ? (
          <div className="space-y-2 border-t pt-3">
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="메모 (예: 9월 모임 장소, 6인 테이블 있음)"
              aria-label="즐겨찾기 메모"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || memo === favorite.memo}
                onClick={() => void run(() => updateFavoriteMemo(favorite.id, memo.trim()), '메모를 저장했어요')}
              >
                메모 저장
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive"
                disabled={busy}
                onClick={() => void run(() => removeFavorite(favorite.id), '즐겨찾기에서 뺐어요')}
              >
                즐겨찾기 해제
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(
                () =>
                  addFavorite(uid, {
                    id: spot.id,
                    name: spot.name,
                    address: spot.address,
                    phone: spot.phone ?? '',
                    lat: spot.lat,
                    lng: spot.lng,
                  }),
                `${spot.name}을(를) 즐겨찾기했어요`,
              )
            }
          >
            <Star className="size-4" />
            즐겨찾기 (다녀온 곳 기록)
          </Button>
        ))}
    </div>
  )
}
