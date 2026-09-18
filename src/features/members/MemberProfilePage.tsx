import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, MessageCircle, PenLine, Zap } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'
import { MemberName } from '@/components/MemberName'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AUTO_TITLES, autoTitleKey, titleText } from '@/data/titles'
import { AchievementList } from '@/features/members/AchievementList'
import { ActivityHistory } from '@/features/members/ActivityHistory'
import { progressKeys, readSeen, writeSeen } from '@/features/members/seenProgress'
import { TierCard } from '@/features/members/TierCard'
import { TitleSection } from '@/features/members/TitleSection'
import { formatDateTime, referrerLabel, toErrorMessage } from '@/lib/format'
import { fetchMemberActivity, progressFor, type MemberActivity } from '@/services/activity'
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

  const member = uid ? byId[uid] : undefined
  const joined = member?.approvedAt ?? member?.createdAt
  const joinedAt = joined ? joined.toMillis() : null
  const isMe = uid === me.uid

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

  const progress = useMemo(() => (activity ? progressFor(activity.stats) : null), [activity])

  // 가진 칭호 값 전부 ('granted:…' + 조건을 채운 'auto:…')
  const grantedTitles = member?.grantedTitles
  const ownedTitleKeys = useMemo(
    () =>
      progress
        ? [
            ...(grantedTitles ?? []),
            ...AUTO_TITLES.filter((t) => progress.earnedAutoIds.has(t.id)).map(autoTitleKey),
          ]
        : [],
    [progress, grantedTitles],
  )

  // NEW 표시: 본인 프로필에서, 지난번에 본 것과 비교한다. 화면을 그린 뒤 지금 것을 "봤음"으로 저장
  const seenBefore = useMemo(() => (isMe && uid && progress ? readSeen(uid) : null), [isMe, uid, progress])
  useEffect(() => {
    if (!isMe || !uid || !progress) return
    writeSeen(uid, progressKeys(progress, ownedTitleKeys))
  }, [isMe, uid, progress, ownedTitleKeys])

  if (!loaded) return <PageSpinner />

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
  const title = titleText(member.titleId, member.grantedTitles, progress?.earnedAutoIds)

  const isNew = (key: string) => !!seenBefore && !seenBefore.has(key)
  const newGoals = progress ? new Set(progress.unlockedGoals.filter((goal) => isNew(`ach:${goal}`))) : undefined
  const newTitleKeys = new Set(ownedTitleKeys.filter((key) => isNew(`title:${key}`)))

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
        <BackButton fallback="/members" />
        <h1 className="text-lg font-semibold">회원 프로필</h1>
      </div>

      <div className="flex items-center gap-4">
        <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-16" />
        <div className="min-w-0 flex-1">
          {title && <p className="truncate text-sm font-medium text-primary">{title}</p>}
          <p className="flex items-center gap-1.5 text-xl font-bold">
            <span className="truncate">{member.nickname}</span>
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

      {activity && progress ? (
        <>
          <TierCard progress={progress} isNew={isNew(`tier:${progress.tier.id}`)} />

          <section className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={CalendarCheck} label="출석" value={`${activity.stats.attended}`} />
              <Stat icon={Zap} label="모임 주최" value={`${activity.stats.hosted}`} />
              <Stat icon={PenLine} label="게시글" value={`${activity.stats.posts}`} />
            </div>
            <p className="text-xs text-muted-foreground">가입일 {formatDateTime(member.approvedAt ?? member.createdAt)}</p>
          </section>

          <TitleSection member={member} stats={activity.stats} progress={progress} isMe={isMe} newKeys={newTitleKeys} />
          <AchievementList progress={progress} newGoals={newGoals} compact={!isMe} />
          <ActivityHistory items={activity.history} />
        </>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
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
                  <MemberName uid={person.uid} className="flex-1 text-sm" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="rounded-xl border px-2 py-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  )
}
