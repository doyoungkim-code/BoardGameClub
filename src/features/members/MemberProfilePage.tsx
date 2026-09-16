import { useEffect, useState } from 'react'
import { subMonths } from 'date-fns'
import { CalendarCheck, CalendarDays, ChevronLeft, MessageCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, referrerLabel, toErrorMessage } from '@/lib/format'
import { openDm } from '@/services/chat'
import { fetchEventsBetween, toEvent } from '@/services/events'
import { countActivity, introducedBy, type MemberActivity } from '@/services/members'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'

/** 활동 통계 집계 기간 */
const MONTHS = 6

export function MemberProfilePage() {
  const { uid } = useParams()
  const navigate = useNavigate()
  const me = useAuth((s) => s.profile)!
  const { loaded, members, byId } = useMembers()
  // 누구의 집계인지 같이 담아 둔다. 보고 있는 회원과 다르면 아직 불러오는 중
  const [counted, setCounted] = useState<{ uid: string; value: MemberActivity } | null>(null)
  const activity = counted && counted.uid === uid ? counted.value : null
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (!uid) return
    let canceled = false
    const done = (value: MemberActivity) => {
      if (!canceled) setCounted({ uid, value })
    }
    fetchEventsBetween(subMonths(new Date(), MONTHS), new Date())
      .then((snap) => done(countActivity(snap.docs.map(toEvent), uid)))
      .catch((error) => {
        console.error('활동 통계 불러오기 실패', error)
        done({ joined: 0, attended: 0 })
      })
    return () => {
      canceled = true
    }
  }, [uid])

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
        <h2 className="font-semibold">활동 (최근 {MONTHS}개월)</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={CalendarDays} label="참석 신청" value={activity ? `${activity.joined}회` : null} />
          <Stat icon={CalendarCheck} label="출석" value={activity ? `${activity.attended}회` : null} />
        </div>
        <p className="text-xs text-muted-foreground">가입일 {formatDateTime(member.approvedAt ?? member.createdAt)}</p>
      </section>

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

function Stat({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string | null }) {
  return (
    <div className="rounded-xl border px-3 py-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      {value === null ? <Skeleton className="mt-1 h-6 w-10" /> : <p className="mt-1 text-lg font-bold">{value}</p>}
    </div>
  )
}
