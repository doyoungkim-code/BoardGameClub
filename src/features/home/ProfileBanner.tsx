import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { TierShield } from '@/components/TierShield'
import { UserAvatar } from '@/components/UserAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { titleText } from '@/data/titles'
import { NewMark } from '@/features/members/AchievementList'
import { hasUnseenAttendanceProgress } from '@/features/members/seenProgress'
import { attendanceProgress } from '@/services/activity'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import { useProgress } from '@/stores/progress'

/**
 * 홈 맨 위의 내 프로필 배너.
 * 출석 횟수(stores/progress.ts 의 6시간 캐시)만으로 티어·경험치·업적·순위를 계산해서 Firestore 를 더 읽지 않는다.
 * 주최·게시글 수처럼 따로 읽어야 하는 값은 프로필 화면(/members/:uid)에만 둔다.
 */
export function ProfileBanner() {
  const profile = useAuth((s) => s.profile)!
  const loaded = useProgress((s) => s.loaded)
  const attendedById = useProgress((s) => s.attendedById)
  const members = useMembers((s) => s.members)

  const attended = attendedById[profile.uid] ?? 0
  const progress = attendanceProgress(attended)
  const { tier, next, xp } = progress
  const title = titleText(profile.titleId, profile.grantedTitles)

  // 동호회 순위: 나보다 많이 출석한 회원 수 + 1 (아직 출석이 없으면 순위를 숨긴다)
  const rank = useMemo(() => {
    if (attended === 0) return null
    const ahead = members.filter((m) => m.uid !== profile.uid && (attendedById[m.uid] ?? 0) > attended).length
    return ahead + 1
  }, [members, attendedById, attended, profile.uid])

  if (!loaded) return <Skeleton className="h-[9.5rem] w-full rounded-2xl" />

  const ratio = next ? (xp - tier.minXp) / (next.minXp - tier.minXp) : 1
  const isNew = hasUnseenAttendanceProgress(profile.uid, attended)

  return (
    <Link to={`/members/${profile.uid}`} className="block">
      <section
        className="relative overflow-hidden rounded-2xl border p-4 transition-shadow hover:shadow-md active:opacity-90"
        style={{
          borderColor: `color-mix(in oklab, ${tier.color} 40%, var(--border))`,
          background: `linear-gradient(135deg, color-mix(in oklab, ${tier.color} 20%, var(--card)), var(--card) 65%)`,
        }}
      >
        {isNew && <NewMark />}

        <div className="flex items-center gap-4">
          <span className="relative shrink-0">
            <span className="block rounded-full border-2 p-0.5" style={{ borderColor: tier.color }}>
              <UserAvatar name={profile.nickname} photoURL={profile.photoURL} className="size-16" />
            </span>
            {/* 방패는 사진 오른쪽 아래에 걸쳐 놓는다 */}
            <TierShield tier={tier} size="md" className="absolute -right-0.5 bottom-0 drop-shadow-sm" />
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            {title && <p className="truncate text-xs font-medium text-primary">{title}</p>}
            <p className="truncate text-xl font-bold">{profile.nickname}</p>
            <p className="flex items-baseline gap-2">
              <span className="text-sm font-semibold" style={{ color: tier.color }}>
                {tier.name}
              </span>
              <span className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</span>
            </p>
          </div>

          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-3 space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-background/70">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${Math.min(ratio, 1) * 100}%`, background: next?.color ?? tier.color }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {next ? `${next.name}까지 ${(next.minXp - xp).toLocaleString()} XP` : '최고 티어예요!'}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 divide-x border-t pt-3 text-center">
          <Stat label="출석" value={`${attended}회`} />
          <Stat label="업적" value={`${progress.unlockedGoals.length}개`} />
          <Stat label="동호회 순위" value={rank ? `${rank}위` : '-'} />
        </div>
      </section>
    </Link>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
