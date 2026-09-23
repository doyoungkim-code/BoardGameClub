import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { TierShield } from '@/components/TierShield'
import { UserAvatar } from '@/components/UserAvatar'
import { NewMark } from '@/features/members/AchievementList'
import { tierEdge, tierGradient } from '@/lib/tier'
import { cn } from '@/lib/utils'
import type { AttendanceProgress } from '@/services/activity'
import type { UserProfile } from '@/types/user'

export type BannerStat = { label: string; value: string }

type Props = {
  member: UserProfile
  progress: AttendanceProgress
  /** 닉네임 앞에 붙는 대표 칭호 (없으면 줄을 비운다) */
  title: string | null
  /** 닉네임 아래 한 줄 (구글 이름·소개자 등) */
  subtitle?: ReactNode
  /** 아래 칸에 넣을 숫자 3~4개 */
  stats: BannerStat[]
  /** 새로 얻은 업적·티어가 있으면 NEW */
  isNew?: boolean
  /** 주면 배너 전체가 이 주소로 가는 링크가 된다 (홈에서 프로필로) */
  to?: string
  /** 오너 배지 등 닉네임 옆에 붙일 것 */
  badge?: ReactNode
}

/**
 * 티어 색을 입은 프로필 배너. 홈(내 요약)과 회원 프로필 상세가 같은 모습을 쓴다.
 * 값 계산은 부르는 쪽에서 한다 (홈은 캐시된 출석 횟수, 프로필은 불러온 활동 기록).
 */
export function TierBanner({ member, progress, title, subtitle, stats, isNew, to, badge }: Props) {
  const { tier, next, xp } = progress
  const ratio = next ? (xp - tier.minXp) / (next.minXp - tier.minXp) : 1

  const banner = (
    <section
      className={cn('relative overflow-hidden rounded-2xl border p-4', to && 'transition-shadow group-hover:shadow-md')}
      style={{ borderColor: tierEdge(tier.color), background: tierGradient(tier.color) }}
    >
      {isNew && <NewMark />}

      <div className="flex items-center gap-4">
        <span className="relative shrink-0">
          <span className="block rounded-full border-2 p-0.5" style={{ borderColor: tier.color }}>
            <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-16" />
          </span>
          {/* 방패는 사진 오른쪽 아래에 걸쳐 놓는다 */}
          <TierShield tier={tier} size="md" className="absolute -right-0.5 bottom-0 drop-shadow-sm" />
        </span>

        <div className="min-w-0 flex-1 space-y-0.5">
          {title && <p className="truncate text-xs font-medium text-primary">{title}</p>}
          <p className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xl font-bold">{member.nickname}</span>
            {badge}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-sm font-semibold" style={{ color: tier.color }}>
              {tier.name}
            </span>
            <span className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</span>
          </p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {to && <ChevronRight className="size-5 shrink-0 text-muted-foreground" />}
      </div>

      <div className="mt-3 space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-background/70">
          {/* 막대는 지금 티어 색으로 채운다 (다음 티어 색으로 채우면 아직 아닌 티어 색이 커 보인다) */}
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(ratio, 1) * 100}%`, background: tier.color }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {next ? `${next.name}까지 ${(next.minXp - xp).toLocaleString()} XP` : '최고 티어예요!'}
        </p>
      </div>

      <div
        className={cn(
          'mt-3 grid divide-x border-t pt-3 text-center',
          stats.length >= 4 ? 'grid-cols-4' : 'grid-cols-3',
        )}
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-sm font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )

  return to ? (
    <Link to={to} className="group block">
      {banner}
    </Link>
  ) : (
    banner
  )
}
