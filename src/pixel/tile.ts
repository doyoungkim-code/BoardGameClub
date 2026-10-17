import type { Sprite } from '@/pixel/draw'

/**
 * 도트 무늬 한 장을 CSS 배경(반복)으로. 상점의 배너 배경 무늬가 쓴다.
 * px: 도트 한 칸의 화면 크기. SVG 를 data URI 로 만들어 흐림 없이 반복된다
 */
export function tileBackground(tile: Sprite, px = 2) {
  const width = (tile.rows[0]?.length ?? 0) * px
  const height = tile.rows.length * px
  const rects = tile.rows
    .flatMap((row, y) =>
      [...row].map((ch, x) => {
        const color = tile.colors[ch]
        return color ? `<rect x='${x * px}' y='${y * px}' width='${px}' height='${px}' fill='${color}'/>` : ''
      }),
    )
    .join('')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' shape-rendering='crispEdges'>${rects}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
