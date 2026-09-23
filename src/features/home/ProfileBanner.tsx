import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { titleText } from '@/data/titles'
import { hasUnseenAttendanceProgress } from '@/features/members/seenProgress'
import { TierBanner } from '@/features/members/TierBanner'
import { attendanceProgress, rankOf, xpRanking } from '@/services/activity'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import { useProgress } from '@/stores/progress'

/**
 * 홈 맨 위의 내 프로필 요약. 모습은 회원 프로필 상세와 같은 `TierBanner` 를 쓴다.
 * 출석 횟수(stores/progress.ts 의 6시간 캐시)만으로 계산해서 Firestore 를 더 읽지 않는다.
 * 주최·게시글 수처럼 따로 읽어야 하는 값은 프로필 화면에만 둔다.
 */
export function ProfileBanner() {
  const profile = useAuth((s) => s.profile)!
  const loaded = useProgress((s) => s.loaded)
  const attendedById = useProgress((s) => s.attendedById)
  const members = useMembers((s) => s.members)

  const attended = attendedById[profile.uid] ?? 0
  const rank = useMemo(() => rankOf(xpRanking(members, attendedById), profile.uid), [members, attendedById, profile.uid])

  if (!loaded) return <Skeleton className="h-[10.5rem] w-full rounded-2xl" />

  const progress = attendanceProgress(attended)

  return (
    <TierBanner
      member={profile}
      progress={progress}
      title={titleText(profile.titleId, profile.grantedTitles)}
      to={`/members/${profile.uid}`}
      isNew={hasUnseenAttendanceProgress(profile.uid, attended)}
      stats={[
        { label: '출석', value: `${attended}회` },
        { label: '업적', value: `${progress.unlockedGoals.length}개` },
        { label: '동호회 순위', value: rank ? `${rank}위` : '-' },
      ]}
    />
  )
}
