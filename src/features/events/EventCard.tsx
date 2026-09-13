import { MapPin, Users } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatEventDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { EVENT_TYPE_LABEL, type ClubEvent } from '@/types/event'

/** 목록·캘린더·홈에서 함께 쓰는 모임 한 줄 */
export function EventCard({ event }: { event: ClubEvent }) {
  const uid = useAuth((s) => s.profile?.uid)
  const attending = !!uid && event.attendeeIds.includes(uid)

  return (
    <Link to={`/events/${event.id}`} className="block">
      <Card className={cn('py-3 transition-colors hover:border-primary/40', event.canceled && 'opacity-60')}>
        <CardContent className="space-y-2 px-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <EventTypeBadge type={event.type} />
            {event.canceled && <Badge variant="destructive">취소됨</Badge>}
            {attending && !event.canceled && <Badge variant="secondary">참석</Badge>}
            <p className={cn('min-w-0 flex-1 truncate font-semibold', event.canceled && 'line-through')}>
              {event.title}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{formatEventDate(event.startAt)}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {event.location && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {event.attendeeIds.length}
              {event.capacity !== null && ` / ${event.capacity}`}명
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function EventTypeBadge({ type }: { type: ClubEvent['type'] }) {
  return <Badge variant={type === 'regular' ? 'default' : 'outline'}>{EVENT_TYPE_LABEL[type]}</Badge>
}

export function EmptyEvents({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">{text}</p>
  )
}
