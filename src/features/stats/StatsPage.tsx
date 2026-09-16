import { useEffect, useMemo, useState } from 'react'
import { subMonths } from 'date-fns'
import { CalendarDays, Dices, Trophy, Users } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GAMES } from '@/data/games'
import { cn } from '@/lib/utils'
import { fetchEventsBetween, toEvent } from '@/services/events'
import { useMembers } from '@/stores/members'
import type { ClubEvent } from '@/types/event'

/** 집계 기간. 무료 한도를 생각해 최근 6개월만 읽는다 */
const MONTHS = 6

export function StatsPage() {
  const [events, setEvents] = useState<ClubEvent[] | null>(null)
  const membersById = useMembers((s) => s.byId)

  useEffect(() => {
    const from = subMonths(new Date(), MONTHS)
    fetchEventsBetween(from, new Date())
      .then((snap) => setEvents(snap.docs.map(toEvent)))
      .catch((error) => {
        console.error('통계용 모임 불러오기 실패', error)
        setEvents([])
      })
  }, [])

  const summary = useMemo(() => {
    if (!events) return null
    // 취소된 모임은 집계에서 뺀다
    const held = events.filter((event) => !event.canceled)
    const attendeeTotal = held.reduce((sum, event) => sum + event.attendeeIds.length, 0)

    // 출석 체크를 한 모임이 있으면 그 기록을, 없으면 참석 신청을 기준으로 센다
    const count = new Map<string, number>()
    for (const event of held) {
      const people = event.attendedIds.length > 0 ? event.attendedIds : event.attendeeIds
      for (const uid of people) count.set(uid, (count.get(uid) ?? 0) + 1)
    }
    const ranking = [...count.entries()]
      .map(([uid, times]) => ({ uid, times }))
      .sort((a, b) => b.times - a.times || (membersById[a.uid]?.nickname ?? '').localeCompare(membersById[b.uid]?.nickname ?? '', 'ko'))

    return {
      heldCount: held.length,
      averageAttendees: held.length === 0 ? 0 : Math.round((attendeeTotal / held.length) * 10) / 10,
      ranking,
    }
  }, [events, membersById])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">최근 {MONTHS}개월 기준</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={CalendarDays} label="열린 모임" value={summary ? `${summary.heldCount}회` : null} />
        <Stat icon={Users} label="평균 참석" value={summary ? `${summary.averageAttendees}명` : null} />
        <Stat icon={Trophy} label="참석한 회원" value={summary ? `${summary.ranking.length}명` : null} />
        <Stat icon={Dices} label="보유 게임" value={`${GAMES.length}개`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">모임 참석 랭킹</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : summary.ranking.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">아직 집계할 모임이 없어요</p>
          ) : (
            <ol className="divide-y">
              {summary.ranking.map(({ uid, times }, index) => {
                const member = membersById[uid]
                return (
                  <li key={uid} className="flex items-center gap-3 py-2">
                    <span
                      className={cn(
                        'w-5 shrink-0 text-center text-sm font-bold',
                        index < 3 ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <UserAvatar name={member?.nickname ?? '?'} photoURL={member?.photoURL ?? null} className="size-8" />
                    <span className="min-w-0 flex-1 truncate text-sm">{member?.nickname ?? '탈퇴한 회원'}</span>
                    <span className="text-sm font-medium">{times}회</span>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | null }) {
  return (
    <div className="rounded-xl border px-3 py-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      {value === null ? <Skeleton className="mt-1 h-6 w-12" /> : <p className="mt-1 text-xl font-bold">{value}</p>}
    </div>
  )
}
