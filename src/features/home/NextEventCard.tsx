import { differenceInCalendarDays, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarPlus, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/stores/auth'
import { useEvents } from '@/stores/events'
import { useMembers } from '@/stores/members'
import type { ClubEvent } from '@/types/event'

/** 홈의 다음 모임. 날짜 블록 + 남은 날 + 참석자 얼굴 */
export function NextEventCard() {
  const { loaded, upcoming } = useEvents()
  // 취소된 모임은 홈에서 감춘다
  const event = upcoming.find((e) => !e.canceled)

  if (!loaded) return <Skeleton className="h-28 w-full rounded-xl" />

  if (!event) {
    return (
      <EmptyState
        icon={CalendarPlus}
        title="예정된 모임이 없어요"
        description="날짜를 정해 모임을 열거나, 언제 모일지 투표를 올려보세요"
        action={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/polls/new">일정 투표</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/events/new">모임 만들기</Link>
            </Button>
          </div>
        }
      />
    )
  }

  return <EventHero event={event} />
}

function EventHero({ event }: { event: ClubEvent }) {
  const uid = useAuth((s) => s.profile?.uid)
  const attending = !!uid && event.attendeeIds.includes(uid)
  const date = event.startAt.toDate()
  const days = differenceInCalendarDays(date, new Date())

  return (
    <Link to={`/events/${event.id}`} className="block">
      <Card className="overflow-hidden py-0 transition-colors hover:border-primary/40 active:bg-muted">
        <div className="flex items-stretch">
          <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-primary/10 text-primary">
            <span className="text-xs">{format(date, 'M월', { locale: ko })}</span>
            <span className="text-3xl leading-none font-bold">{format(date, 'd')}</span>
            <span className="text-xs">{format(date, '(E)', { locale: ko })}</span>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>{days <= 0 ? '오늘' : days === 1 ? '내일' : `D-${days}`}</Badge>
              {attending && <Badge variant="secondary">참석</Badge>}
            </div>
            <p className="truncate font-semibold">{event.title}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{format(date, 'a h:mm', { locale: ko })}</span>
              {event.location && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </div>
            <Attendees ids={event.attendeeIds} capacity={event.capacity} />
          </div>
        </div>
      </Card>
    </Link>
  )
}

const SHOWN = 5

/** 참석자 얼굴을 겹쳐서 보여준다 (회원 정보는 이미 받아 둔 것을 쓴다) */
function Attendees({ ids, capacity }: { ids: string[]; capacity: number | null }) {
  const byId = useMembers((s) => s.byId)
  if (ids.length === 0) return <p className="text-xs text-muted-foreground">아직 참석자가 없어요</p>

  return (
    <div className="flex items-center gap-2 pt-0.5">
      <div className="flex -space-x-2">
        {ids.slice(0, SHOWN).map((id) => {
          const member = byId[id]
          return (
            <UserAvatar
              key={id}
              name={member?.nickname ?? '?'}
              photoURL={member?.photoURL}
              className="size-6 ring-2 ring-card"
            />
          )
        })}
      </div>
      <span className="text-xs text-muted-foreground">
        {ids.length > SHOWN && `+${ids.length - SHOWN} · `}
        {ids.length}
        {capacity !== null && ` / ${capacity}`}명
      </span>
    </div>
  )
}
