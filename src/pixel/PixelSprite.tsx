import type { Sprite } from '@/pixel/draw'
import { cn } from '@/lib/utils'

type Props = {
  sprite: Sprite
  /** 도트 한 칸의 화면 크기(px). 정수여야 또렷하다 */
  scale?: number
  className?: string
  label?: string
}

/**
 * 도트 그림(src/pixel/draw.ts 의 Sprite)을 SVG 로 그린다. 캔버스 장면과 같은 데이터를 화면 곳곳(배너 소품·상점)에서 쓴다
 */
export function PixelSprite({ sprite, scale = 3, className, label }: Props) {
  const width = sprite.rows[0]?.length ?? 0
  const height = sprite.rows.length
  return (
    <svg
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0', className)}
    >
      {sprite.rows.flatMap((row, y) =>
        [...row].map((ch, x) => {
          const color = sprite.colors[ch]
          return color ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null
        }),
      )}
    </svg>
  )
}
