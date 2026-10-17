import { ditherBands, ditherGlow, dot, drawSprite, rect, seeded, type Ctx, type Sprite } from '@/pixel/draw'
import { PAL, SKY, skyTimeOf, type SkyTime } from '@/pixel/palette'

/**
 * 보드게임 카페 창가 (홈 맨 위, 주사위 화면).
 * 높이는 40도트로 고정이고 너비는 화면에 맞춰 늘어난다(창문·램프·선반 위치가 너비에 따라 정해진다).
 * 창밖 하늘은 기기 시각에 따라 새벽·낮·노을·밤(별)으로 바뀐다.
 */
export const CAFE_HEIGHT = 40

export type CafeOptions = {
  /** 굴릴 주사위가 있으면 테이블 주사위가 반짝인다 */
  diceReady?: boolean
  /** 하늘 (없으면 지금 시각으로 고른다) */
  sky?: SkyTime
}

export type Box = { x: number; y: number; w: number; h: number }

const MEEPLE_ROWS = ['..#..', '.###.', '#####', '.###.', '.#.#.', '##.##']
const meeple = (color: string): Sprite => ({ rows: MEEPLE_ROWS, colors: { '#': color } })

const SHADE: Sprite = {
  rows: ['...###...', '..#lll#..', '.#lllll#.', '#########'],
  colors: { '#': PAL.lampShade, l: PAL.lampShadeLight },
}

const CUP: Sprite = {
  rows: ['#####..', '#ccc###', '#www#.#', '#www###', '#www#..', '.###...'],
  colors: { '#': PAL.outline, c: PAL.coffee, w: PAL.cream },
}

const CAT: Sprite = {
  rows: ['.#.#......', '.###......', '#####.....', '#########.', '##########'],
  colors: { '#': PAL.cat },
}

const DISC: Sprite = { rows: ['.###.', '#####', '#####', '#####', '.###.'], colors: { '#': '#fff' } }
const disc = (color: string): Sprite => ({ rows: DISC.rows, colors: { '#': color } })

const CLOUD: Sprite = { rows: ['..###....', '.#####.##', '#########'], colors: { '#': '#ffffff' } }

/** 주사위 눈 위치 (5×5 칸 안쪽 좌표) */
const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
}

/** 7×7 픽셀 주사위 하나 (모서리 한 칸 깎음) */
export function drawDie(ctx: Ctx, x: number, y: number, face: number, edge: string = PAL.outline) {
  rect(ctx, x + 1, y, 5, 1, edge)
  rect(ctx, x + 1, y + 6, 5, 1, edge)
  rect(ctx, x, y + 1, 1, 5, edge)
  rect(ctx, x + 6, y + 1, 1, 5, edge)
  rect(ctx, x + 1, y + 1, 5, 5, PAL.cream)
  for (const [px, py] of PIPS[face] ?? PIPS[1]) dot(ctx, x + 1 + px, y + 1 + py, PAL.copperDark)
}

/** 같은 수에는 늘 같은 눈 (멈춰 있을 때 매 프레임 바뀌지 않게) */
const faceOf = (n: number) => 1 + (((n * 2654435761) >>> 0) % 6)

/**
 * 한 프레임 그리기. t 는 초, frame 은 프레임 번호(초당 12).
 * 주사위가 놓인 자리를 돌려준다 (눌렀는지 확인용)
 */
export function drawCafe(ctx: Ctx, W: number, t: number, frame: number, options: CafeOptions = {}): Box {
  const H = CAFE_HEIGHT
  const tableY = H - 11
  const sky = options.sky ?? skyTimeOf(new Date())

  // ── 벽·천장 ──
  rect(ctx, 0, 0, W, tableY, PAL.wall)
  for (let x = 7; x < W; x += 9) {
    rect(ctx, x, 0, 1, tableY, PAL.wallDark)
    rect(ctx, x + 1, 0, 1, tableY, PAL.wallLight)
  }
  rect(ctx, 0, 0, W, 2, PAL.woodDark)

  // ── 창문 ──
  const winX = 5
  const winY = 5
  const winW = Math.max(30, Math.min(48, Math.round(W * 0.34)))
  const winH = 20
  const inner = { x: winX + 2, y: winY + 2, w: winW - 4, h: winH - 4 }
  rect(ctx, winX, winY, winW, winH, PAL.wood)
  rect(ctx, winX, winY, winW, 1, PAL.woodLight)
  drawSky(ctx, inner, sky, t, frame)
  // 창살: 가운데 세로 1줄, 가로 1줄
  rect(ctx, inner.x + Math.floor(inner.w / 2), inner.y, 1, inner.h, PAL.wood)
  rect(ctx, inner.x, inner.y + Math.floor(inner.h / 2), inner.w, 1, PAL.wood)
  // 창턱
  const sillY = winY + winH
  rect(ctx, winX - 2, sillY, winW + 4, 2, PAL.woodLight)
  rect(ctx, winX - 2, sillY + 2, winW + 4, 1, PAL.woodDark)

  // ── 창턱에서 자는 고양이 (꼬리가 천천히 흔들린다) ──
  const catX = winX + winW - 13
  const catY = sillY - 5
  drawSprite(ctx, CAT, catX, catY)
  const tailUp = Math.floor(t * 1.5) % 2 === 0
  if (tailUp) {
    dot(ctx, catX + 10, catY + 3, PAL.cat)
    dot(ctx, catX + 11, catY + 2, PAL.cat)
  } else {
    dot(ctx, catX + 10, catY + 4, PAL.cat)
    dot(ctx, catX + 11, catY + 4, PAL.cat)
  }

  // ── 오른쪽 벽 선반의 게임 상자들 (넓을 때만) ──
  const shelfW = 26
  const shelfX = W - shelfW - 5
  const hasShelf = W >= 104
  if (hasShelf) {
    const widths = [4, 3, 5, 4, 3, 5, 4]
    const heights = [7, 9, 6, 8, 7, 6, 9]
    for (const [row, plankY] of [11, 24].entries()) {
      let x = shelfX + 1
      let i = row * 3
      while (x + widths[i % widths.length] <= shelfX + shelfW - 1) {
        const w = widths[i % widths.length]
        const h = heights[(i + row) % heights.length]
        rect(ctx, x, plankY - h, w, h, PAL.boxes[i % PAL.boxes.length])
        rect(ctx, x, plankY - h + 2, w, 1, PAL.cream)
        rect(ctx, x + w - 1, plankY - h, 1, h, PAL.outline)
        x += w + (i % 3 === 0 ? 1 : 0)
        i++
      }
      rect(ctx, shelfX, plankY, shelfW, 1, PAL.woodLight)
      rect(ctx, shelfX, plankY + 1, shelfW, 1, PAL.woodDark)
    }
  }

  // ── 램프와 불빛 ──
  const right = hasShelf ? shelfX : W
  const lampX = Math.round(winX + winW + (right - winX - winW) / 2)
  rect(ctx, lampX, 2, 1, 4, PAL.woodDark)
  drawSprite(ctx, SHADE, lampX - 4, 6)
  dot(ctx, lampX, 10, PAL.bulb)
  // 불빛: 아래로 갈수록 넓어지는 반투명 삼각형. 줄마다 정수 칸으로 그려서 가장자리가 계단 모양이 된다
  ctx.save()
  ctx.globalAlpha = 0.13
  for (let y = 11; y < tableY; y++) {
    const half = Math.round(2 + (y - 11) * 0.75)
    rect(ctx, lampX - half, y, half * 2 + 1, 1, PAL.lampLight)
  }
  ctx.restore()

  // ── 테이블 ──
  rect(ctx, 0, tableY, W, 2, PAL.tableTop)
  rect(ctx, 0, tableY, W, 1, PAL.tableTopLight)
  rect(ctx, 0, tableY + 2, W, 1, PAL.tableEdge)
  rect(ctx, 0, tableY + 3, W, H - tableY - 3, PAL.woodDark)
  for (let x = 4; x < W; x += 12) rect(ctx, x, tableY + 5, 6, 1, PAL.wood)
  // 테이블에 떨어진 불빛 (가장자리만 점 무늬로 흐려진다)
  ditherGlow(ctx, lampX - 16, tableY, 33, 2, PAL.lampLight, 0.25)
  ctx.save()
  ctx.globalAlpha = 0.25
  rect(ctx, lampX - 11, tableY, 23, 2, PAL.lampLight)
  ctx.restore()

  // ── 게임판 + 미플 ──
  const boardW = 18
  const boardX = lampX - Math.floor(boardW / 2)
  rect(ctx, boardX, tableY - 1, boardW, 3, PAL.boardEdge)
  for (let x = 0; x < boardW - 2; x++) {
    rect(ctx, boardX + 1 + x, tableY, 1, 1, Math.floor(x / 2) % 2 === 0 ? PAL.boardA : PAL.boardB)
    rect(ctx, boardX + 1 + x, tableY + 1, 1, 1, Math.floor(x / 2) % 2 === 0 ? PAL.boardB : PAL.boardA)
  }
  const hopping = Math.floor(t / 1.5) % 3
  const hopNow = t % 1.5 < 0.25
  for (let i = 0; i < 3; i++) {
    const lift = hopNow && i === hopping ? 2 : 0
    drawSprite(ctx, meeple(PAL.meeples[i]), boardX + 2 + i * 5, tableY - 7 - lift)
  }

  // ── 커피잔과 김 ──
  const cupX = boardX - 11
  const cupY = tableY - 6
  if (cupX > winX) {
    drawSprite(ctx, CUP, cupX, cupY)
    for (let i = 0; i < 3; i++) {
      const rise = (t * 4 + i * 2.7) % 8
      const sx = cupX + 1 + i + Math.round(Math.sin(t * 3 + i) * 1)
      if (rise < 7) dot(ctx, sx, cupY - 1 - Math.floor(rise), PAL.steam)
    }
  }

  // ── 주사위 두 개 (가끔 굴러간다. 굴릴 기회가 있으면 반짝인다) ──
  const diceX = boardX + boardW + 3
  const diceY = tableY - 7
  const cycle = Math.floor(t / 8)
  const phase = t % 8
  const rolling = phase < 1.2
  const jump = rolling ? Math.round(Math.sin((phase / 1.2) * Math.PI) * 5) : 0
  const ready = !!options.diceReady
  const blink = ready && Math.floor(t * 2) % 2 === 0
  const edge = blink ? PAL.sparkle : PAL.outline
  for (let i = 0; i < 2; i++) {
    const face = rolling ? 1 + ((frame + i * 3) % 6) : faceOf(cycle * 2 + i)
    drawDie(ctx, diceX + i * 9, diceY - (i === 0 ? jump : Math.max(0, jump - 2)), face, edge)
  }
  if (ready) {
    const twinkle = frame % 6
    if (twinkle < 3) dot(ctx, diceX - 1, diceY - 3, PAL.sparkle)
    if (twinkle >= 2 && twinkle < 5) dot(ctx, diceX + 16, diceY - 2, PAL.sparkle)
    if (twinkle >= 4) dot(ctx, diceX + 8, diceY - 5, PAL.sparkle)
  }

  return { x: diceX - 2, y: diceY - 7, w: 20, h: 16 }
}

/** 창밖 하늘 (창 안쪽만 그리도록 잘라 낸다) */
function drawSky(ctx: Ctx, area: Box, sky: SkyTime, t: number, frame: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(area.x, area.y, area.w, area.h)
  ctx.clip()
  ditherBands(ctx, area.x, area.y, area.w, area.h, SKY[sky])

  if (sky === 'night') {
    const rand = seeded(7)
    const count = Math.round((area.w * area.h) / 22)
    for (let i = 0; i < count; i++) {
      const x = area.x + Math.floor(rand() * area.w)
      const y = area.y + Math.floor(rand() * (area.h - 3))
      // 별이 하나씩 돌아가며 잠깐 꺼진다 (반짝임)
      if ((frame + i * 7) % 23 > 1) dot(ctx, x, y, i % 4 === 0 ? '#fff6cf' : '#c9d4ff')
    }
    drawSprite(ctx, disc('#f4efd8'), area.x + area.w - 8, area.y + 2)
    dot(ctx, area.x + area.w - 6, area.y + 4, '#d9d2b5')
  } else if (sky === 'sunset') {
    drawSprite(ctx, disc('#ffd27a'), area.x + Math.floor(area.w * 0.3), area.y + area.h - 5)
  } else {
    drawSprite(ctx, disc(sky === 'day' ? '#fff1a8' : '#ffd0a8'), area.x + area.w - 8, area.y + (sky === 'day' ? 2 : 6))
    // 구름이 천천히 흘러간다
    const span = area.w + 10
    for (let i = 0; i < 2; i++) {
      const x = area.x - 10 + Math.floor((t * 2 + i * (span / 2)) % span)
      drawSprite(ctx, CLOUD, x, area.y + 3 + i * 5)
    }
  }
  ctx.restore()
}
