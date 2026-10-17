import { ditherGlow, dot, rect, type Ctx } from '@/pixel/draw'
import { PAL } from '@/pixel/palette'

/**
 * 주사위 화면의 초록 펠트 판. 굴리는 동안 주사위가 튀며 눈이 바뀌고, 결과가 오면 떨어져 멈추며 반짝인다.
 * 상태가 바뀐 시각(since)은 performance.now() 기준 초 — 그리는 쪽도 같은 시계를 쓴다
 */
export const TRAY_HEIGHT = 22

export type TrayState = {
  mode: 'idle' | 'rolling' | 'done'
  /** 보여 줄 눈 (주사위 개수만큼) */
  faces: number[]
  since: number
}

/** 9×9 큰 주사위의 눈 위치 (안쪽 7×7 칸 좌표). 눈 사이를 한 칸씩 띄워 6 도 점 여섯 개로 보인다 */
const BIG_PIPS: Record<number, [number, number][]> = {
  1: [[3, 3]],
  2: [[1, 1], [5, 5]],
  3: [[1, 1], [3, 3], [5, 5]],
  4: [[1, 1], [5, 1], [1, 5], [5, 5]],
  5: [[1, 1], [5, 1], [3, 3], [1, 5], [5, 5]],
  6: [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]],
}

function drawBigDie(ctx: Ctx, x: number, y: number, face: number, edge: string) {
  rect(ctx, x + 1, y, 7, 1, edge)
  rect(ctx, x + 1, y + 8, 7, 1, edge)
  rect(ctx, x, y + 1, 1, 7, edge)
  rect(ctx, x + 8, y + 1, 1, 7, edge)
  rect(ctx, x + 1, y + 1, 7, 7, PAL.cream)
  // 오른쪽·아래 안쪽에 그늘 한 줄 (입체감)
  rect(ctx, x + 1, y + 7, 7, 1, PAL.creamDark)
  rect(ctx, x + 7, y + 1, 1, 7, PAL.creamDark)
  for (const [px, py] of BIG_PIPS[face] ?? BIG_PIPS[1]) dot(ctx, x + 1 + px, y + 1 + py, PAL.copperDark)
}

const FELT = '#2f6b4f'
const FELT_DARK = '#285c44'

export function drawTray(ctx: Ctx, W: number, frame: number, state: TrayState) {
  const H = TRAY_HEIGHT
  const elapsed = performance.now() / 1000 - state.since

  // 펠트 + 나무 테두리
  rect(ctx, 0, 0, W, H, FELT)
  ditherGlow(ctx, 0, 0, W, H, FELT_DARK, 0.18)
  rect(ctx, 0, 0, W, 2, PAL.wood)
  rect(ctx, 0, H - 2, W, 2, PAL.woodDark)
  rect(ctx, 0, 0, 2, H, PAL.wood)
  rect(ctx, W - 2, 0, 2, H, PAL.woodDark)
  rect(ctx, 0, 0, W, 1, PAL.woodLight)

  const count = Math.max(1, state.faces.length)
  const gap = 5
  const total = count * 9 + (count - 1) * gap
  const left = Math.floor((W - total) / 2)
  const baseY = H - 2 - 11

  for (let i = 0; i < count; i++) {
    let x = left + i * (9 + gap)
    let y = baseY
    let face = state.faces[i] ?? 5
    if (state.mode === 'rolling') {
      // 굴러가는 중: 좌우로 흔들리고 튀며 눈이 계속 바뀐다
      x += Math.round(Math.sin(elapsed * 14 + i * 2) * 4)
      y -= Math.round(Math.abs(Math.sin(elapsed * 9 + i)) * 7)
      face = 1 + ((frame * 7 + i * 3) % 6)
    } else if (state.mode === 'done' && elapsed < 0.4) {
      // 떨어져서 한 번 통 튀고 멈춘다
      y -= Math.round(Math.sin((elapsed / 0.4) * Math.PI) * 2)
    }
    // 그림자
    rect(ctx, x + 1, baseY + 9, 8, 1, FELT_DARK)
    drawBigDie(ctx, x, y, face, state.mode === 'done' && elapsed < 1.5 && frame % 4 < 2 ? PAL.sparkle : PAL.outline)
  }

  // 결과가 나오면 잠깐 반짝임
  if (state.mode === 'done' && elapsed < 1.5) {
    const spots = [
      [left - 3, baseY - 2],
      [left + total + 2, baseY],
      [left + Math.floor(total / 2), baseY - 5],
      [left - 2, baseY + 8],
      [left + total + 1, baseY - 4],
    ]
    spots.forEach(([sx, sy], i) => {
      if ((frame + i) % 3 === 0) dot(ctx, sx, sy, PAL.sparkle)
    })
  }
}
