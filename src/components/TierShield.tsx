import type { Tier } from '@/data/achievements'
import { cn } from '@/lib/utils'

const SIZES = { sm: 13, md: 18, lg: 56 } as const

type Props = {
  tier: Tier
  size?: keyof typeof SIZES
  className?: string
}

/** 티어 방패 배지. 티어 색(src/data/achievements.ts 의 TIERS)으로 칠하고, 챌린저는 금테 + 빛 */
export function TierShield({ tier, size = 'sm', className }: Props) {
  const width = SIZES[size]
  const challenger = tier.id === 'challenger'
  return (
    <svg
      width={width}
      height={Math.round(width * 1.17)}
      viewBox="0 0 24 28"
      role="img"
      aria-label={`${tier.name} 티어`}
      className={cn('shrink-0', challenger && 'drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]', className)}
    >
      <title>{tier.name}</title>
      <path
        d="M12 1.5 21.5 5v8c0 6.6-4.2 10.9-9.5 13.5C6.7 23.9 2.5 19.6 2.5 13V5z"
        fill={tier.color}
        stroke={challenger ? '#facc15' : 'white'}
        strokeWidth={challenger ? 2 : 1.5}
        strokeLinejoin="round"
      />
      {/* 왼쪽 위 반사광 */}
      <path d="M12 4.5 5.5 7v6c0 4.2 2.4 7.3 6.5 9.6z" fill="white" opacity="0.22" />
    </svg>
  )
}
