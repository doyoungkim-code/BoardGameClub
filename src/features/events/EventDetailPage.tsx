import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { CalendarDays, Check, ChevronLeft, EllipsisVertical, MapPin, UserPlus, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AttendeeManagerDialog } from '@/features/events/AttendeeManagerDialog'
import { EventTypeBadge } from '@/features/events/EventCard'
import { usePlaces } from '@/hooks/usePlaces'
import { formatEventRange, toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  canManage,
  deleteEvent,
  eventRef,
  hasStarted,
  isFull,
  isPast,
  setAttended,
  setAttending,
  setEventCanceled,
  toEvent,
} from '@/services/events'
import { useAuth, useIsOwner } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import type { ClubEvent } from '@/types/event'

export function EventDetailPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState<ClubEvent | null | undefined>(undefined)

  useEffect(() => {
    if (!eventId) return
    // 참석 인원이 실시간으로 바뀌므로 상세는 구독한다
    return onSnapshot(
      eventRef(eventId),
      (snap) => setEvent(snap.exists() ? toEvent(snap) : null),
      (error) => {
        console.error('모임 구독 실패', error)
        setEvent(null)
      },
    )
  }, [eventId])

  if (event === undefined) return <PageSpinner />
  if (!event) {
    return (
      <div className="space-y-4 text-center">
        <p className="py-16 text-sm text-muted-foreground">모임을 찾을 수 없어요</p>
        <Button asChild variant="outline">
          <Link to="/events">모임 목록으로</Link>
        </Button>
      </div>
    )
  }
  return <EventDetail event={event} />
}

function EventDetail({ event }: { event: ClubEvent }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const membersById = useMembers((s) => s.byId)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null)

  const manageable = canManage(event, profile.uid, isOwner)
  const attending = event.attendeeIds.includes(profile.uid)
  const past = isPast(event)
  const host = membersById[event.hostId]
  // 장소 이름이 지도에 등록된 카페와 같으면 지도로 연결한다
  const places = usePlaces()
  const place = places?.find((p) => p.name === event.location.trim())

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } catch (error) {
      console.error('모임 처리 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const toggleAttend = () =>
    run(async () => {
      await setAttending(event.id, profile.uid, !attending)
      toast.success(attending ? '참석을 취소했어요' : '참석 신청했어요')
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/events" aria-label="모임 목록으로">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <EventTypeBadge type={event.type} />
          {event.canceled && <Badge variant="destructive">취소됨</Badge>}
          {!event.canceled && past && <Badge variant="secondary">지난 모임</Badge>}
        </div>
        {manageable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="모임 관리">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/events/${event.id}/edit`}>수정</Link>
              </DropdownMenuItem>
              {event.canceled ? (
                <DropdownMenuItem onSelect={() => void run(() => setEventCanceled(event.id, false))}>
                  취소 되돌리기
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setConfirm('cancel')}>모임 취소</DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('delete')}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-3">
        <h1 className={cn('text-2xl font-bold', event.canceled && 'line-through')}>{event.title}</h1>
        <dl className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <dt>
              <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
              <span className="sr-only">일시</span>
            </dt>
            <dd>{formatEventRange(event.startAt, event.endAt)}</dd>
          </div>
          {event.location && (
            <div className="flex items-start gap-2">
              <dt>
                <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                <span className="sr-only">장소</span>
              </dt>
              <dd>
                {place ? (
                  <Link to={`/places?place=${place.id}`} className="text-primary underline-offset-4 hover:underline">
                    {event.location} (지도 보기)
                  </Link>
                ) : (
                  event.location
                )}
              </dd>
            </div>
          )}
          <div className="flex items-start gap-2">
            <dt>
              <Users className="mt-0.5 size-4 text-muted-foreground" />
              <span className="sr-only">참석 인원</span>
            </dt>
            <dd>
              {event.attendeeIds.length}
              {event.capacity !== null && ` / ${event.capacity}`}명
              {event.capacity !== null && isFull(event) && !attending && (
                <span className="ml-2 text-destructive">정원이 찼어요</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          주최 {host?.nickname ?? '알 수 없음'}
        </p>
      </div>

      {event.description && <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>}

      {!event.canceled && !past && (
        <Button
          className="h-11 w-full"
          variant={attending ? 'outline' : 'default'}
          disabled={busy || (!attending && isFull(event))}
          onClick={toggleAttend}
        >
          {attending ? '참석 취소' : isFull(event) ? '정원 마감' : '참석 신청'}
        </Button>
      )}

      <Attendees event={event} manageable={manageable} />

      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="모임을 취소할까요?"
        description="참석자에게 취소된 모임으로 표시돼요. 다시 되돌릴 수 있어요."
        confirmLabel="모임 취소"
        destructive
        onConfirm={() => run(() => setEventCanceled(event.id, true))}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="모임을 삭제할까요?"
        description="기록이 완전히 사라져요. 취소만 하려면 '모임 취소'를 쓰세요."
        confirmLabel="삭제"
        destructive
        onConfirm={() =>
          run(async () => {
            await deleteEvent(event.id)
            toast.success('모임을 삭제했어요')
            navigate('/events', { replace: true })
          })
        }
      />
    </div>
  )
}

/** 참석자 목록. 호스트·오너는 여기서 출석을 체크한다 */
function Attendees({ event, manageable }: { event: ClubEvent; manageable: boolean }) {
  const membersById = useMembers((s) => s.byId)
  const isOwner = useIsOwner()
  const [managing, setManaging] = useState(false)
  // 모임이 시작된 뒤부터 호스트·오너가 출석을 체크한다
  const checking = manageable && hasStarted(event) && !event.canceled

  const toggleAttended = (uid: string, attended: boolean) => {
    setAttended(event.id, uid, attended).catch((error) => {
      console.error('출석 체크 실패', error)
      toast.error(toErrorMessage(error))
    })
  }

  return (
    <section className="space-y-2 border-t pt-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">참석자 {event.attendeeIds.length}명</h2>
        {checking && <p className="flex-1 text-xs text-muted-foreground">눌러서 출석 체크</p>}
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
            <UserPlus className="size-4" />
            참석자 관리
          </Button>
        )}
      </div>
      {isOwner && <AttendeeManagerDialog event={event} open={managing} onOpenChange={setManaging} />}
      {event.attendeeIds.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">아직 참석자가 없어요</p>
      ) : (
        <ul className="divide-y">
          {event.attendeeIds.map((uid) => {
            const member = membersById[uid]
            const attended = event.attendedIds.includes(uid)
            const row = (
              <>
                <UserAvatar name={member?.nickname ?? '?'} photoURL={member?.photoURL ?? null} className="size-8" />
                <span className="min-w-0 flex-1 truncate text-sm">{member?.nickname ?? '알 수 없는 회원'}</span>
                {uid === event.hostId && <Badge variant="secondary">주최</Badge>}
                {attended && (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Check className="size-3.5" />
                    출석
                  </span>
                )}
              </>
            )
            return (
              <li key={uid}>
                {checking ? (
                  <button
                    type="button"
                    onClick={() => toggleAttended(uid, !attended)}
                    aria-pressed={attended}
                    className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:bg-accent"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 py-2">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
