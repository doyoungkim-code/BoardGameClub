import { useCallback, useRef } from 'react'
import { PixelCanvas } from '@/pixel/PixelCanvas'
import { CAFE_HEIGHT, drawCafe, type Box } from '@/pixel/scenes/cafe'
import { PAL } from '@/pixel/palette'

type Props = {
  /** 굴릴 주사위가 있으면 테이블 주사위가 반짝인다 */
  diceReady?: boolean
  /** 테이블 주사위를 눌렀을 때 */
  onDice?: () => void
}

/** 홈 맨 위의 움직이는 도트 장면: 보드게임 카페 창가 (src/pixel/scenes/cafe.ts) */
export function CafeScene({ diceReady, onDice }: Props) {
  const diceBox = useRef<Box | null>(null)
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, size: { w: number }, t: number, frame: number) => {
      diceBox.current = drawCafe(ctx, size.w, t, frame, { diceReady })
    },
    [diceReady],
  )

  return (
    <PixelCanvas
      height={CAFE_HEIGHT}
      draw={draw}
      label="보드게임 카페 창가. 창밖 하늘이 지금 시각에 따라 바뀌어요"
      // 캔버스 너비가 3px 단위라 남는 1~2px 은 벽 색으로 채운다
      className="pixel-border border-foreground/70 pixel-shadow"
      style={{ backgroundColor: PAL.wall }}
      onPress={
        onDice
          ? (x, y) => {
              const box = diceBox.current
              if (box && x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) onDice()
            }
          : undefined
      }
    />
  )
}
