/**
 * 도트 그림 그리기 도구. 캔버스의 1칸 = 도트 1개 (화면에서는 PixelCanvas 가 정수배로 키운다).
 * 이미지 파일 없이 사각형만으로 그린다 (참고: 「오퍼스 5.5가 짠 움직이는 도트」 같은 코드 도트).
 */

export type Ctx = CanvasRenderingContext2D

/** 사각형 하나 (좌표·크기는 도트 단위 정수) */
export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

/** 도트 하나 */
export function dot(ctx: Ctx, x: number, y: number, color: string) {
  rect(ctx, x, y, 1, 1, color)
}

/**
 * 도트 그림(스프라이트): 글자 격자 + 색 범례. '.' 과 ' ' 는 빈칸.
 * 예) { rows: ['.##.', '#oo#'], colors: { '#': '#3b2a1e', o: '#fbf8f1' } }
 * 같은 데이터를 React 에서는 PixelSprite.tsx 가 SVG 로 그린다 (배너 소품 등)
 */
export type Sprite = { rows: readonly string[]; colors: Readonly<Record<string, string>> }

export function drawSprite(ctx: Ctx, sprite: Sprite, x: number, y: number, flip = false) {
  const width = sprite.rows[0]?.length ?? 0
  sprite.rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const color = sprite.colors[row[dx]]
      if (color) dot(ctx, x + (flip ? width - 1 - dx : dx), y + dy, color)
    }
  })
}

/** 4×4 Bayer 행렬: 두 색을 점 무늬로 섞어 '중간 색'을 만든다 (디더링) */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/** (x, y) 칸이 비율 t(0~1) 만큼 두 번째 색을 쓸 차례인지 */
export const ditherOn = (x: number, y: number, t: number) => BAYER[y & 3][x & 3] < t * 16

/**
 * 위에서 아래로 여러 색 띠를 디더링으로 이어 그린다 (하늘 그라데이션).
 * 색 사이 경계를 부드러운 그라데이션 대신 점 무늬로 섞어서 영상처럼 도트 느낌이 난다
 */
export function ditherBands(ctx: Ctx, x: number, y: number, w: number, h: number, colors: readonly string[]) {
  if (colors.length === 1) return rect(ctx, x, y, w, h, colors[0])
  for (let dy = 0; dy < h; dy++) {
    const pos = (dy / Math.max(1, h - 1)) * (colors.length - 1)
    const i = Math.min(colors.length - 2, Math.floor(pos))
    const t = pos - i
    for (let dx = 0; dx < w; dx++) {
      dot(ctx, x + dx, y + dy, ditherOn(x + dx, y + dy, t) ? colors[i + 1] : colors[i])
    }
  }
}

/** 따뜻한 빛: 영역 안 일부 칸만 반투명 색으로 덮는다 (램프 불빛). strength 0~1 */
export function ditherGlow(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, strength: number) {
  ctx.fillStyle = color
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (ditherOn(x + dx, y + dy, strength)) ctx.fillRect(x + dx, y + dy, 1, 1)
    }
  }
}

/** 시간이 흘러도 같은 결과를 주는 간단한 난수 (별 위치 등을 매 프레임 같게) */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
