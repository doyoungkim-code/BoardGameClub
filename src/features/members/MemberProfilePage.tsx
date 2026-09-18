import { useEffect, useState } from 'react'
import { CalendarCheck, ChevronLeft, MessageCircle, PenLine, Trophy, Zap } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ACHIEVEMENTS, isUnlocked } from '@/data/achievements'
import { AchievementList } from '@/features/members/AchievementList'
import { ActivityHistory } from '@/features/members/ActivityHistory'
import { formatDateTime, referrerLabel, toErrorMessage } from '@/lib/format'
import { fetchMemberActivity, type MemberActivity } from '@/services/activity'
import { openDm } from '@/services/chat'
import { introducedBy } from '@/services/members'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'

export function MemberProfilePage() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const me = useAuth((s) => s.profile)!
  const { loaded, members, byId } = useMembers()
  // 누구의 기록인지 같이 담아 둔다. 보고 있는 회원과 다르면 아직 불러오는 중
  const [loadedFor, setLoadedFor] = useState<{ uid: string; value: MemberActivity } | null>(null)
  const activity = loadedFor && loadedFor.uid === uid ? loadedFor.value : null
  const [opening, setOpening] = useState(false)

  const joined = uid ? byId[uid]?.approvedAt ?? byId[uid]?.createdAt : null
  const joinedAt = joined ? joined.toMillis() : null

  useEffect(() => {
    if (!uid || !loaded) return
    let canceled = false
    fetchMemberActivity(uid, joinedAt)
      .then((value) => {
        if (!canceled) setLoadedFor({ uid, value })
      })
      .catch((error) => {
        console.error('활동 기록 불러오기 실패', error)
        toast.error('활동 기록을 불러오지 못했어요')
      })
    return () => {
      canceled = true
    }
  }, [uid, loaded, joinedAt])

  if (!loaded) return <PageSpinner />

  const member = uid ? byId[uid] : undefined
  if (!member) {
    return (
      <div className="space-y-4 text-center">
        <p className="py-16 text-sm text-muted-foreground">회원을 찾을 수 없어요</p>
        <Button asChild variant="outline">
          <Link to="/members">회원 목록으로</Link>
        </Button>
      </div>
    )
  }

  const referrer = referrerLabel(member, byId)
  const introduced = introducedBy(members, member.uid)
  const isMe = member.uid === me.uid

  const startDm = async () => {
    setOpening(true)
    try {
      const dmId = await openDm(me.uid, member.uid)
      navigate(`/dm/${dmId}`)
    } catch (error) {
      console.error('DM 열기 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/members" aria-label="회원 목록으로">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">회원 프로필</h1>
      </div>

      <div className="flex items-center gap-4">
        <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-16" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xl font-bold">
            {member.nickname}
            {member.role === 'owner' && <Badge variant="secondary">오너</Badge>}
          </p>
          <p className="truncate text-sm text-muted-foreground">{member.googleName}</p>
          {referrer && <p className="text-sm text-muted-foreground">{referrer}</p>}
        </div>
      </div>

      {isMe ? (
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/me">내 정보 수정</Link>
        </Button>
      ) : (
        <Button className="h-11 w-full" disabled={opening} onClick={() => void startDm()}>
          <MessageCircle className="size-4" />
          메시지 보내기
        </Button>
      )}

      <section className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <Stat icon={CalendarCheck} label="출석" value={activity && `${activity.stats.attended}`} />
          <Stat icon={Zap} label="번개 주최" value={activity && `${activity.stats.flashHosted}`} />
          <Stat icon={PenLine} label="게시글" value={activity && `${activity.stats.posts}`} />
          <Stat
            icon={Trophy}
            label="업적"
            value={activity && `${ACHIEVEMENTS.filter((a) => isUnlocked(a, activity.stats)).length}`}
          />
        </div>
        <p className="text-xs text-muted-foreground">가입일 {formatDateTime(member.approvedAt ?? member.createdAt)}</p>
      </section>

      {activity ? (
        <>
          <AchievementList stats={activity.stats} />
          <ActivityHistory items={activity.history} />
        </>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {introduced.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">소개한 회원 {introduced.length}명</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {introduced.map((person) => (
              <li key={person.uid}>
                <Link to={`/members/${person.uid}`} className="flex items-center gap-3 px-4 py-3 active:bg-muted">
                  <UserAvatar name={person.nickname} photoURL={person.photoURL} className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-sm">{person.nickname}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string | null }) {
  return (
    <div className="rounded-xl border px-2 py-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      {value === null ? <Skeleton className="mx-auto mt-1 h-6 w-8" /> : <p className="mt-0.5 text-lg font-bold">{value}</p>}
    </div>
  )
}
