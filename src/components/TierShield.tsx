import type { Tier } from '@/data/achievements'
import { cn } from '@/lib/utils'

/** 12×14 칸 픽셀 방패. 너비가 12px 의 정수배(12·24·48)일 때만 또렷하다 */
const SIZES = { sm: 12, md: 24, lg: 48 } as const

/*
 * 방패 그림 (한 줄 12칸 × 14줄). # = 테두리, o = 티어 색, h = 티어 색 위에 밝은 면(왼쪽 위 반사광), . = 빈칸.
 * 곡선 대신 계단으로 아래가 뾰족해진다
 */
const SHIELD = [
  '.##########.',
  '#hhhooooooo#',
  '#hhoooooooo#',
  '#hooooooooo#',
  '#oooooooooo#',
  '#oooooooooo#',
  '#oooooooooo#',
  '#oooooooooo#',
  '.#oooooooo#.',
  '.#oooooooo#.',
  '..#oooooo#..',
  '...#oooo#...',
  '....#oo#....',
  '.....##.....',
]

const cellsOf = (marks: string) =>
  SHIELD.flatMap((row, y) => [...row].flatMap((ch, x) => (marks.includes(ch) ? [{ x, y }] : [])))

const EDGE = cellsOf('#')
const BODY = cellsOf('oh')
const SHINE = cellsOf('h')

type Props = {
  tier: Tier
  size?: keyof typeof SIZES
  className?: string
}

/**
 * 티어 방패 배지. 티어 색(src/data/achievements.ts 의 TIERS)으로 칠한 픽셀 방패.
 * 챌린저는 흐린 빛 대신 금테가 두 프레임으로 반짝인다 (index.css 의 tier-shield-sparkle)
 */
export function TierShield({ tier, size = 'sm', className }: Props) {
  const width = SIZES[size]
  const challenger = tier.id === 'challenger'
  return (
    <svg
      width={width}
      height={(width / 12) * 14}
      viewBox="0 0 12 14"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${tier.name} 티어`}
      className={cn('shrink-0', challenger && 'tier-shield-sparkle', className)}
    >
      <title>{tier.name}</title>
      {BODY.map(({ x, y }) => (
        <rect key={`b${x}-${y}`} x={x} y={y} width={1} height={1} fill={tier.color} />
      ))}
      {SHINE.map(({ x, y }) => (
        <rect key={`s${x}-${y}`} x={x} y={y} width={1} height={1} fill="white" fillOpacity={0.45} />
      ))}
      {/* 테두리: 보통은 진한 원목색, 챌린저는 금색 (반짝임은 CSS 로 금색↔흰색) */}
      {EDGE.map(({ x, y }) => (
        <rect
          key={`e${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          className={challenger ? 'tier-shield-edge' : undefined}
          fill={challenger ? '#facc15' : '#3b2a1e'}
        />
      ))}
    </svg>
  )
}
