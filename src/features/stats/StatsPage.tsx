import { useEffect, useMemo, useState } from 'react'
import { subMonths } from 'date-fns'
import { CalendarDays, Dices, Trophy, Users } from 'lucide-react'
import { Link } from 'react-router'
import { MemberName } from '@/components/MemberName'
import { UserAvatar } from '@/components/UserAvatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { tierFor, xpFor } from '@/data/achievements'
import { GAMES } from '@/data/games'
import { cn } from '@/lib/utils'
import { countsAsAttended } from '@/services/activity'
import { fetchEventsBetween, toEvent } from '@/services/events'
import { useMembers } from '@/stores/members'
import { useProgress } from '@/stores/progress'
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

    // 회원 프로필·업적과 같은 기준으로 센다 (services/activity.ts 의 countsAsAttended)
    const count = new Map<string, number>()
    for (const event of held) {
      for (const uid of event.attendeeIds) {
        if (countsAsAttended(event, uid)) count.set(uid, (count.get(uid) ?? 0) + 1)
      }
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

      <TierRanking />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 {MONTHS}개월 참석 랭킹</CardTitle>
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
                    <MemberName uid={uid} fallback="탈퇴한 회원" className="flex-1 text-sm" />
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

/**
 * 가입 후 전체 기간 경험치 순위. 모든 회원 출석 횟수(stores/progress.ts, 6시간마다 새로 셈)로 계산한다.
 * 같은 경험치면 닉네임 가나다순
 */
function TierRanking() {
  const { loaded, attendedById } = useProgress()
  const members = useMembers((s) => s.members)

  const ranking = members
    .map((member) => {
      const xp = xpFor(attendedById[member.uid] ?? 0)
      return { member, xp, tier: tierFor(xp) }
    })
    .filter((row) => row.xp > 0)
    .sort((a, b) => b.xp - a.xp || a.member.nickname.localeCompare(b.member.nickname, 'ko'))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">티어 랭킹</CardTitle>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : ranking.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">아직 출석한 회원이 없어요</p>
        ) : (
          <ol className="divide-y">
            {ranking.map(({ member, xp, tier }, index) => (
              <li key={member.uid}>
                <Link to={`/members/${member.uid}`} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      'w-5 shrink-0 text-center text-sm font-bold',
                      index < 3 ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </span>
                  <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-8" />
                  <MemberName uid={member.uid} className="flex-1 text-sm" />
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-medium" style={{ color: tier.color }}>
                      {tier.name}
                    </span>
                    <span className="text-muted-foreground">{xp.toLocaleString()} XP</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
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
