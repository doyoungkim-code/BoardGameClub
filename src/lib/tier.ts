/**
 * 티어 색(src/data/achievements.ts 의 `TIERS[].color`)을 배경·테두리에 옅게 섞어 쓰는 함수들.
 * 밝기 차이를 색이 알아서 맞추도록 `color-mix` 를 쓴다 (나중에 다크 모드를 켜도 같은 식이 쓰인다).
 */

/** 카드 배경처럼 아주 옅게 */
export const tierTint = (color: string, percent = 12) => `color-mix(in oklab, ${color} ${percent}%, var(--card))`

/** 테두리 */
export const tierEdge = (color: string, percent = 40) => `color-mix(in oklab, ${color} ${percent}%, var(--border))`

/** 진한 외곽선 (픽셀 배너 테두리): 티어 색을 어둡게 */
export const tierOutline = (color: string) => `color-mix(in oklab, ${color} 65%, black)`

/**
 * 배너 바탕 무늬: 2px 점이 대각선으로 놓인 도트 무늬 (8px 마다 반복, 흐림 없음).
 * 그라데이션은 픽셀 UI 에서 번져 보여서, 옅은 티어 색 바탕 위에 진한 점을 깐다
 */
export function tierPattern(color: string) {
  const fill = color.replace('#', '%23')
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'>` +
    `<rect x='0' y='0' width='2' height='2' fill='${fill}' fill-opacity='0.18'/>` +
    `<rect x='4' y='4' width='2' height='2' fill='${fill}' fill-opacity='0.18'/></svg>`
  return `url("data:image/svg+xml,${svg}")`
}

/** 진행 막대 채우기: 6px 칸 + 2px 틈이 반복되는 블록 (게임 체력바처럼) */
export const pixelBlocks = (color: string) =>
  `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 8px)`
