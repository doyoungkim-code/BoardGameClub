import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { Vote } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { openPollsQuery, toPoll, voterCount } from '@/services/polls'
import { useAuth } from '@/stores/auth'
import type { Poll } from '@/types/poll'

/** 모임 목록 맨 위: 진행 중인 일정 투표 (없으면 아무것도 안 그린다) */
export function OpenPolls() {
  const uid = useAuth((s) => s.profile?.uid)
  const [polls, setPolls] = useState<Poll[] | null>(null)

  useEffect(
    () =>
      onSnapshot(
        openPollsQuery(),
        (snap) =>
          setPolls(
            snap.docs
              .map(toPoll)
              .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)),
          ),
        (error) => {
          console.error('일정 투표 구독 실패', error)
          setPolls([])
        },
      ),
    [],
  )

  if (!polls || polls.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">일정 투표 중</h2>
      {polls.map((poll) => {
        const voted = !!uid && (poll.votes?.[uid]?.length ?? 0) > 0
        return (
          <Link key={poll.id} to={`/polls/${poll.id}`} className="block">
            <Card className="border-primary/30 bg-primary/5 py-3 transition-colors hover:border-primary/60">
              <CardContent className="flex items-center gap-3 px-4">
                <Vote className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{poll.title}</p>
                  <p className="text-xs text-muted-foreground">
                    후보 {poll.options.length}개 · {voterCount(poll)}명 투표
                  </p>
                </div>
                {voted ? <Badge variant="secondary">투표함</Badge> : <Badge>투표하기</Badge>}
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </section>
  )
}
