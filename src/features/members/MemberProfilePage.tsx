import { useEffect, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { MemberName } from '@/components/MemberName'
import { PageHeader } from '@/components/PageHeader'
import { PageSpinner } from '@/components/PageSpinner'
import { CardSkeleton } from '@/components/Skeletons'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AUTO_TITLES, autoTitleKey, titleText } from '@/data/titles'
import { SectionTitle } from '@/components/SectionTitle'
import { AchievementList } from '@/features/members/AchievementList'
import { ActivityHistory } from '@/features/members/ActivityHistory'
import { progressKeys, readSeen, writeSeen } from '@/features/members/seenProgress'
import { TierBanner } from '@/features/members/TierBanner'
import { TitleSection } from '@/features/members/TitleSection'
import { formatDateTime, referrerLabel, toErrorMessage } from '@/lib/format'
import { tappableRow } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { fetchMemberActivity, progressFor, rankOf, xpRanking, type MemberActivity } from '@/services/activity'
import { openDm } from '@/services/chat'
import { introducedBy } from '@/services/members'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import { useProgress } from '@/stores/progress'

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

  // 동호회 순위는 모든 회원의 출석 횟수(6시간 캐시)로 계산한다. 통계 화면의 티어 랭킹과 같은 함수
  const attendedById = useProgress((s) => s.attendedById)
  const rank = useMemo(() => (uid ? rankOf(xpRanking(members, attendedById), uid) : null), [members, attendedById, uid])

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
  const bannerStats = [
    { label: '출석', value: `${activity?.stats.attended ?? 0}회` },
    { label: '주최', value: `${activity?.stats.hosted ?? 0}회` },
    { label: '게시글', value: `${activity?.stats.posts ?? 0}개` },
    { label: '순위', value: rank ? `${rank}위` : '-' },
  ]
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
      <PageHeader title="회원 프로필" backTo="/members" className="[&_h1]:text-lg [&_h1]:font-semibold" />

      {progress ? (
        <TierBanner
          member={member}
          progress={progress}
          title={title}
          subtitle={[member.googleName, referrer].filter(Boolean).join(' · ')}
          badge={member.role === 'owner' && <Badge variant="secondary">오너</Badge>}
          isNew={isNew(`tier:${progress.tier.id}`)}
          stats={bannerStats}
        />
      ) : (
        <Skeleton className="h-[10.5rem] w-full rounded-2xl" />
      )}

      <div className="space-y-2">
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
        <p className="text-center text-xs text-muted-foreground">
          가입일 {formatDateTime(member.approvedAt ?? member.createdAt)}
        </p>
      </div>

      {activity && progress ? (
        <>
          <TitleSection member={member} stats={activity.stats} progress={progress} isMe={isMe} newKeys={newTitleKeys} />
          <AchievementList progress={progress} newGoals={newGoals} compact={!isMe} />
          <ActivityHistory items={activity.history} />
        </>
      ) : (
        <CardSkeleton count={2} className="h-32" />
      )}

      {introduced.length > 0 && (
        <section className="space-y-2">
          <SectionTitle count={`${introduced.length}명`}>소개한 회원</SectionTitle>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {introduced.map((person) => (
              <li key={person.uid}>
                <Link to={`/members/${person.uid}`} className={cn('flex items-center gap-3 px-4 py-3', tappableRow)}>
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
