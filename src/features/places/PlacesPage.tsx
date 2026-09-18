import { useState } from 'react'
import { ExternalLink, MapPin, MapPinPlus, Navigation, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlaceFormDialog } from '@/features/places/PlaceFormDialog'
import { PlaceMap, type LatLng } from '@/features/places/PlaceMap'
import { usePlaces } from '@/hooks/usePlaces'
import { toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { canEditPlace, deletePlace, kakaoMapUrl, kakaoRouteUrl } from '@/services/places'
import { useAuth, useIsOwner } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import type { Place } from '@/types/place'

/**
 * 위치 찍기 흐름
 * - 새 장소: [장소 추가] → 지도 누르기 → 이름 입력
 * - 핀 옮기기: [위치 옮기기] → 지도 누르기 → 저장
 */
type Picking = { target: 'new' } | { target: 'move'; place: Place } | null

export function PlacesPage() {
  const places = usePlaces()
  const uid = useAuth((s) => s.profile!.uid)
  const isOwner = useIsOwner()
  const membersById = useMembers((s) => s.byId)
  // 다른 화면에서 /places?place=<id> 로 들어오면 그 장소를 먼저 보여준다
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('place')

  const [picking, setPicking] = useState<Picking>(null)
  const [draft, setDraft] = useState<LatLng | null>(null)
  const [form, setForm] = useState<{ place?: Place } | null>(null)
  const [removing, setRemoving] = useState<Place | null>(null)

  const select = (placeId: string | null) =>
    setSearchParams(placeId ? { place: placeId } : {}, { replace: true })

  const selected = places?.find((p) => p.id === selectedId) ?? null

  const handlePick = (point: LatLng) => {
    if (!picking) return
    setDraft(point)
    setForm(picking.target === 'move' ? { place: picking.place } : {})
    setPicking(null)
  }

  const closeForm = (open: boolean) => {
    if (open) return
    setForm(null)
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">지도</h1>
        <Button size="sm" variant={picking ? 'outline' : 'default'} onClick={() => setPicking(picking ? null : { target: 'new' })}>
          {picking ? <X className="size-4" /> : <MapPinPlus className="size-4" />}
          {picking ? '취소' : '장소 추가'}
        </Button>
      </div>

      {picking && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          {picking.target === 'new' ? '지도에서 카페 위치를 눌러주세요' : `${picking.place.name}의 새 위치를 눌러주세요`}
        </p>
      )}

      {places === null ? (
        <Skeleton className="h-[55dvh] w-full rounded-xl" />
      ) : (
        <PlaceMap
          places={places}
          selectedId={selectedId}
          onSelect={select}
          picking={!!picking}
          onPick={handlePick}
          draft={draft}
          className="h-[55dvh] md:h-[60dvh]"
        />
      )}

      {selected && (
        <PlaceCard
          place={selected}
          addedBy={membersById[selected.createdBy]?.nickname}
          editable={canEditPlace(selected, uid, isOwner)}
          onClose={() => select(null)}
          onEdit={() => setForm({ place: selected })}
          onMove={() => setPicking({ target: 'move', place: selected })}
          onDelete={() => setRemoving(selected)}
        />
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">등록된 장소 {places && places.length > 0 && places.length}</h2>
        {places?.length === 0 ? (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            아직 등록된 장소가 없어요. 자주 가는 카페를 찍어주세요!
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {places?.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => {
                    select(place.id)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted',
                    place.id === selectedId && 'bg-accent',
                  )}
                >
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{place.name}</span>
                    {place.address && <span className="block truncate text-xs text-muted-foreground">{place.address}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlaceFormDialog
        open={!!form}
        onOpenChange={closeForm}
        point={draft}
        place={form?.place}
        onSaved={(placeId) => select(placeId)}
      />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`${removing?.name ?? ''}을(를) 지울까요?`}
        description="지도에서 사라져요."
        confirmLabel="삭제"
        destructive
        onConfirm={async () => {
          if (!removing) return
          try {
            await deletePlace(removing.id)
            select(null)
            toast.success('장소를 지웠어요')
          } catch (error) {
            console.error('장소 삭제 실패', error)
            toast.error(toErrorMessage(error))
          }
        }}
      />
    </div>
  )
}

type CardProps = {
  place: Place
  addedBy?: string
  editable: boolean
  onClose: () => void
  onEdit: () => void
  onMove: () => void
  onDelete: () => void
}

function PlaceCard({ place, addedBy, editable, onClose, onEdit, onMove, onDelete }: CardProps) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{place.name}</p>
          {place.address && <p className="text-sm text-muted-foreground">{place.address}</p>}
        </div>
        <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-8" onClick={onClose} aria-label="닫기">
          <X className="size-4" />
        </Button>
      </div>
      {place.memo && <p className="text-sm whitespace-pre-wrap">{place.memo}</p>}
      {addedBy && <p className="text-xs text-muted-foreground">{addedBy}님이 등록</p>}

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={kakaoMapUrl(place)} target="_blank" rel="noreferrer noopener">
            <ExternalLink className="size-4" />
            카카오맵
          </a>
        </Button>
        <Button asChild size="sm">
          <a href={kakaoRouteUrl(place)} target="_blank" rel="noreferrer noopener">
            <Navigation className="size-4" />
            길찾기
          </a>
        </Button>
      </div>

      {editable && (
        <div className="flex gap-1 border-t pt-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            수정
          </Button>
          <Button variant="ghost" size="sm" onClick={onMove}>
            위치 옮기기
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={onDelete}>
            삭제
          </Button>
        </div>
      )}
    </div>
  )
}
