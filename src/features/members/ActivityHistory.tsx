import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarCheck, CalendarDays, Megaphone, PenLine } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ActivityItem } from '@/services/activity'
import { EVENT_TYPE_LABEL } from '@/types/event'
import { BOARD_LABEL } from '@/types/post'

const PAGE = 10

/** 활동 기록: 출석·주최한 모임과 쓴 글을 최근 순으로 */
export function ActivityHistory({ items }: { items: ActivityItem[] }) {
  const [shown, setShown] = useState(PAGE)

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">활동 기록</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          아직 활동 기록이 없어요
        </p>
      ) : (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {items.slice(0, shown).map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  to={item.kind === 'event' ? `/events/${item.id}` : `/posts/${item.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-muted"
                >
                  <ItemIcon item={item} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {format(item.at, 'yyyy. M. d. (E)', { locale: ko })} · {describe(item)}
                    </span>
                  </span>
                  {item.kind === 'event' && item.hosted && <Badge variant="secondary">주최</Badge>}
                </Link>
              </li>
            ))}
          </ul>
          {shown < items.length && (
            <Button variant="outline" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
              더 보기 ({items.length - shown}개 남음)
            </Button>
          )}
        </>
      )}
    </section>
  )
}

function describe(item: ActivityItem) {
  if (item.kind === 'post') return `${BOARD_LABEL[item.board]} 게시판에 글`
  const type = EVENT_TYPE_LABEL[item.eventType]
  return item.attended ? `${type} 출석` : `${type} 주최`
}

function ItemIcon({ item }: { item: ActivityItem }) {
  const Icon =
    item.kind === 'post' ? (item.board === 'notice' ? Megaphone : PenLine) : item.attended ? CalendarCheck : CalendarDays
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
  )
}
