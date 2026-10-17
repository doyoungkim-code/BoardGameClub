import type { ReactNode } from 'react'
import { ChevronRight } from '@/components/icons'
import { Link } from 'react-router'
import { TierShield } from '@/components/TierShield'
import { UserAvatar } from '@/components/UserAvatar'
import { ITEM_BY_ID } from '@/data/shopItems'
import { NewMark } from '@/features/members/AchievementList'
import { pixelBlocks, tierOutline, tierPattern, tierTint } from '@/lib/tier'
import { cn } from '@/lib/utils'
import { PixelSprite } from '@/pixel/PixelSprite'
import { tileBackground } from '@/pixel/tile'
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
  /** 상점 미리보기: 회원이 단 것 대신 이 배경 무늬·소품으로 그린다 */
  decor?: BannerDecor
}

/** 배너 꾸미기 (상점 아이템 id. src/data/shopItems.ts) */
export type BannerDecor = { background: string | null; prop: string | null }

/**
 * 티어 색을 입은 프로필 배너. 홈(내 요약)과 회원 프로필 상세가 같은 모습을 쓴다.
 * 값 계산은 부르는 쪽에서 한다 (홈은 캐시된 출석 횟수, 프로필은 불러온 활동 기록).
 */
export function TierBanner({ member, progress, title, subtitle, stats, isNew, to, badge, decor }: Props) {
  const { tier, next, xp } = progress
  // 상점에서 산 배경 무늬·도트 소품. 회원 문서에 있어서 다른 회원 배너에도 추가 읽기 없이 보인다
  const background = ITEM_BY_ID[(decor ? decor.background : member.bannerBackground) ?? '']
  const prop = ITEM_BY_ID[(decor ? decor.prop : member.bannerProp) ?? '']
  const ratio = next ? (xp - tier.minXp) / (next.minXp - tier.minXp) : 1

  const banner = (
    <section
      className={cn('relative overflow-hidden pixel-border pixel-shadow p-4', to && 'group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:shadow-none')}
      style={{
        borderColor: tierOutline(tier.color),
        backgroundColor: tierTint(tier.color, 16),
        backgroundImage: background ? tileBackground(background.sprite) : tierPattern(tier.color),
      }}
    >
      {isNew && <NewMark />}
      {prop && (
        <PixelSprite sprite={prop.sprite} scale={3} label={prop.name} className="absolute top-2 right-2" />
      )}

      <div className="flex items-center gap-4">
        <span className="relative shrink-0">
          <span className="block border-2 p-0.5" style={{ borderColor: tier.color }}>
            <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-16" />
          </span>
          {/* 방패는 사진 오른쪽 아래에 걸쳐 놓는다 */}
          <TierShield tier={tier} size="md" className="absolute -right-1.5 -bottom-1" />
        </span>

        <div className={cn('min-w-0 flex-1 space-y-0.5', prop && 'pr-8')}>
          {title && <p className="truncate text-xs font-normal text-primary">{title}</p>}
          <p className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xl font-bold">{member.nickname}</span>
            {badge}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="text-sm font-bold" style={{ color: tier.color }}>
              {tier.name}
            </span>
            <span className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</span>
          </p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {/* 소품이 오른쪽 위를 차지하면 화살표는 뺀다 (배너 전체를 눌러도 된다) */}
        {to && !prop && <ChevronRight className="size-5 shrink-0 text-muted-foreground" />}
      </div>

      <div className="mt-3 space-y-1">
        <div className="h-3 overflow-hidden border-2 border-foreground/70 bg-background">
          {/* 지금 티어 색 블록으로 채운다. 5% 단위로 끊어서 칸이 반쯤 걸치지 않게 */}
          <div
            className="h-full"
            style={{ width: `${Math.round(Math.min(ratio, 1) * 20) * 5}%`, background: pixelBlocks(tier.color) }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {next ? `${next.name}까지 ${(next.minXp - xp).toLocaleString()} XP` : '최고 티어예요!'}
        </p>
      </div>

      <div
        className={cn(
          'mt-3 grid divide-x-2 divide-foreground/20 border-t-2 border-foreground/20 pt-3 text-center',
          stats.length >= 4 ? 'grid-cols-4' : 'grid-cols-3',
        )}
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-sm font-bold">{stat.value}</p>
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
