import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, isSameDay, startOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CalendarDays, CalendarPlus, List, Plus, Vote } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SegmentedTabs } from '@/components/SegmentedTabs'
import { CardSkeleton } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/features/events/EventCard'
import { EventCalendar } from '@/features/events/EventCalendar'
import { OpenPolls } from '@/features/polls/OpenPolls'
import { dayKey } from '@/lib/format'
import {
  fetchEventsBetween,
  fetchPastEvents,
  fetchPastEventsAfter,
  PAST_PAGE_SIZE,
  startOfToday,
  toEvent,
} from '@/services/events'
import { startEventsSync, useEvents } from '@/stores/events'
import type { ClubEvent } from '@/types/event'

type View = 'list' | 'calendar'

export function EventsPage() {
  const [view, setView] = useState<View>('list')

  useEffect(() => startEventsSync(), [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="모임"
        actions={
          <>
            {/* 날짜를 정하기 전: 후보를 올려 언제 모일지 투표 */}
            <Button asChild size="sm" variant="outline">
              <Link to="/polls/new">
                <Vote className="size-4" />
                일정 투표
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/events/new">
                <Plus className="size-4" />
                모임 만들기
              </Link>
            </Button>
          </>
        }
      />

      <SegmentedTabs items={VIEW_TABS} active={view} onSelect={(key) => setView(key as View)} />

      {view === 'list' ? <ListView /> : <CalendarView />}
    </div>
  )
}

const VIEW_TABS = [
  { key: 'list', label: '목록', icon: List },
  { key: 'calendar', label: '캘린더', icon: CalendarDays },
]

// ---------- 목록 ----------

function ListView() {
  const { loaded, upcoming } = useEvents()

  return (
    <div className="space-y-6">
      <OpenPolls />

      <section className="space-y-2">
        <h2 className="font-semibold">다가오는 모임</h2>
        {!loaded ? (
          <CardSkeleton />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="예정된 모임이 없어요"
            action={
              <Button asChild size="sm">
                <Link to="/events/new">모임 만들기</Link>
              </Button>
            }
          />
        ) : (
          upcoming.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>

      <PastEvents />
    </div>
  )
}

/** 지난 모임은 실시간 구독하지 않고 필요할 때만 불러온다 (읽기 횟수 절약) */
function PastEvents() {
  const [events, setEvents] = useState<ClubEvent[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cursor = events?.at(-1)?.startAt
      const snap = cursor ? await fetchPastEventsAfter(startOfToday(), cursor) : await fetchPastEvents(startOfToday())
      const page = snap.docs.map(toEvent)
      setEvents((prev) => [...(prev ?? []), ...page])
      setHasMore(page.length === PAST_PAGE_SIZE)
    } catch (error) {
      console.error('지난 모임 불러오기 실패', error)
      setEvents((prev) => prev ?? [])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [events])

  if (!opened) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setOpened(true)
          void load()
        }}
      >
        지난 모임 보기
      </Button>
    )
  }

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">지난 모임</h2>
      {events === null ? (
        <CardSkeleton />
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="지난 모임이 없어요" size="sm" />
      ) : (
        <>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {hasMore && (
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => void load()}>
              더 보기
            </Button>
          )}
        </>
      )}
    </section>
  )
}

// ---------- 캘린더 ----------

function CalendarView() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())
  // 어느 달의 결과인지 같이 담아 둔다. 보고 있는 달과 다르면 아직 불러오는 중
  const [loadedMonth, setLoadedMonth] = useState<{ month: number; events: ClubEvent[] } | null>(null)
  const events = loadedMonth?.month === month.getTime() ? loadedMonth.events : null

  useEffect(() => {
    let canceled = false
    const done = (list: ClubEvent[]) => {
      if (!canceled) setLoadedMonth({ month: month.getTime(), events: list })
    }
    fetchEventsBetween(startOfMonth(month), endOfMonth(month))
      .then((snap) => done(snap.docs.map(toEvent)))
      .catch((error) => {
        console.error('달력 모임 불러오기 실패', error)
        done([])
      })
    return () => {
      canceled = true
    }
  }, [month])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ClubEvent[]>()
    for (const event of events ?? []) {
      const key = dayKey(event.startAt.toDate())
      map.set(key, [...(map.get(key) ?? []), event])
    }
    return map
  }, [events])

  const selectedEvents = eventsByDay.get(dayKey(selected)) ?? []

  return (
    <div className="space-y-4">
      <EventCalendar
        month={month}
        onMonthChange={(next) => {
          setMonth(next)
          // 달을 옮기면 그 달 1일을 보여준다 (같은 달이면 선택 유지)
          setSelected((prev) => (isSameDay(startOfMonth(prev), next) ? prev : next))
        }}
        selected={selected}
        onSelect={setSelected}
        eventsByDay={eventsByDay}
      />

      <section className="space-y-2 border-t pt-4">
        <h2 className="font-semibold">{format(selected, 'M월 d일 (E)', { locale: ko })}</h2>
        {events === null ? (
          <CardSkeleton />
        ) : selectedEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title="이 날은 모임이 없어요" size="sm" />
        ) : (
          selectedEvents.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>
    </div>
  )
}
