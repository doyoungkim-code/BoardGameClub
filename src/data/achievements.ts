/**
 * 출석 업적 · 경험치(XP) · 티어. 숫자·이름·아이콘은 여기만 고치면 화면에 바로 반영된다
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

/** 목록 순서대로 화면에 나온다 (goal 오름차순을 유지할 것) */
export const ATTENDANCE_ACHIEVEMENTS: AttendanceAchievement[] = [
  { goal: 1, icon: '🎲', name: '첫 발걸음', bonusXp: 10 },
  { goal: 2, icon: '👋', name: '또 왔어요', bonusXp: 10 },
  { goal: 3, icon: '🤝', name: '세 번째 만남', bonusXp: 15 },
  { goal: 5, icon: '🙌', name: '단골손님', bonusXp: 20 },
  { goal: 7, icon: '🍀', name: '럭키 세븐', bonusXp: 25 },
  { goal: 10, icon: '🔥', name: '개근러', bonusXp: 30 },
  { goal: 15, icon: '🎯', name: '보드게임 중독', bonusXp: 40 },
  { goal: 20, icon: '🏠', name: '터줏대감', bonusXp: 50 },
  { goal: 25, icon: '⭐', name: '반오십', bonusXp: 60 },
  { goal: 30, icon: '🏛️', name: '동호회의 기둥', bonusXp: 70 },
  { goal: 40, icon: '🎖️', name: '베테랑', bonusXp: 90 },
  { goal: 50, icon: '👑', name: '살아있는 전설', bonusXp: 110 },
  { goal: 70, icon: '🏆', name: '명예의 전당', bonusXp: 150 },
  { goal: 100, icon: '💯', name: '백전노장', bonusXp: 200 },
]

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
