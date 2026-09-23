/**
 * 티어 색(src/data/achievements.ts 의 `TIERS[].color`)을 배경·테두리에 옅게 섞어 쓰는 함수들.
 * 밝기 차이를 색이 알아서 맞추도록 `color-mix` 를 쓴다 (나중에 다크 모드를 켜도 같은 식이 쓰인다).
 */

/** 카드 배경처럼 아주 옅게 */
export const tierTint = (color: string, percent = 12) => `color-mix(in oklab, ${color} ${percent}%, var(--card))`

/** 테두리 */
export const tierEdge = (color: string, percent = 40) => `color-mix(in oklab, ${color} ${percent}%, var(--border))`

/** 배너 배경: 왼쪽 위가 진하고 오른쪽 아래로 옅어진다 */
export const tierGradient = (color: string) => `linear-gradient(135deg, ${tierTint(color, 20)}, var(--card) 65%)`
