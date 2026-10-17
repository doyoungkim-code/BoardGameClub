import { useCallback } from 'react'
import { PixelCanvas } from '@/pixel/PixelCanvas'
import { drawTray, TRAY_HEIGHT, type TrayState } from '@/pixel/scenes/diceTray'

/** 주사위 화면 위쪽의 펠트 판 (src/pixel/scenes/diceTray.ts) */
export function DiceTray({ state }: { state: TrayState }) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, size: { w: number }, _t: number, frame: number) => drawTray(ctx, size.w, frame, state),
    [state],
  )
  const label =
    state.mode === 'rolling' ? '주사위가 굴러가는 중' : `주사위 눈 ${state.faces.join(', ') || '없음'}`
  return (
    <PixelCanvas
      height={TRAY_HEIGHT}
      pixel={6}
      draw={draw}
      label={label}
      className="pixel-border border-foreground/70 pixel-shadow"
      style={{ backgroundColor: '#2f6b4f' }}
    />
  )
}
