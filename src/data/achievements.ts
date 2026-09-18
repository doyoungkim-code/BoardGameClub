import { ACHIEVEMENT_LIST } from '@/data/achievementList'

/**
 * 출석 업적 · 경험치(XP) · 티어 계산.
 * 업적 이름·아이콘·조건은 src/data/achievementList.ts 에서 고친다. 여기는 티어와 계산식
 * (저장하는 데이터가 없고 매번 출석 기록으로 계산한다).
 *
 * XP = 출석 1회마다 XP_PER_ATTENDANCE + 달성한 출석 업적의 보너스 XP 합
 * 티어 = XP 가 minXp 이상인 가장 높은 티어
 */

/** 출석 1회마다 받는 경험치 */
export const XP_PER_ATTENDANCE = 10

export type AttendanceAchievement = {
  /** 이만큼 출석하면 달성 */
  goal: number
  icon: string
  name: string
  /** 달성하면 한 번 더 받는 경험치 */
  bonusXp: number
}

/** 이름·아이콘을 아직 안 정한 업적은 기본값으로 채운다 */
export const ATTENDANCE_ACHIEVEMENTS: AttendanceAchievement[] = [...ACHIEVEMENT_LIST]
  .sort((a, b) => a.goal - b.goal)
  .map((entry) => ({
    goal: entry.goal,
    bonusXp: entry.bonusXp,
    icon: entry.icon.trim() || '🎲',
    name: entry.name.trim() || `출석 ${entry.goal}회`,
  }))

export type TierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'challenger'

export type Tier = {
  id: TierId
  name: string
  /** 이 경험치부터 이 티어 */
  minXp: number
  /** 방패 색 */
  color: string
}

/** 낮은 티어부터. 옆 주석은 대략 몇 번 출석하면 오르는지 */
export const TIERS: Tier[] = [
  { id: 'bronze', name: '브론즈', minXp: 0, color: '#a0643a' },
  { id: 'silver', name: '실버', minXp: 40, color: '#94a3b8' }, // 2회
  { id: 'gold', name: '골드', minXp: 105, color: '#eab308' }, // 5회
  { id: 'platinum', name: '플래티넘', minXp: 210, color: '#14b8a6' }, // 10회
  { id: 'diamond', name: '다이아', minXp: 400, color: '#38bdf8' }, // 20회
  { id: 'master', name: '마스터', minXp: 630, color: '#a855f7' }, // 30회
  { id: 'challenger', name: '챌린저', minXp: 1030, color: '#ef4444' }, // 50회
]

/** 출석 횟수 → 경험치 */
export function xpFor(attended: number) {
  const bonus = ATTENDANCE_ACHIEVEMENTS.filter((a) => attended >= a.goal).reduce((sum, a) => sum + a.bonusXp, 0)
  return attended * XP_PER_ATTENDANCE + bonus
}

export function tierFor(xp: number): Tier {
  return [...TIERS].reverse().find((tier) => xp >= tier.minXp) ?? TIERS[0]
}

/** 다음 티어. 챌린저면 null */
export function nextTier(xp: number): Tier | null {
  return TIERS.find((tier) => tier.minXp > xp) ?? null
}
