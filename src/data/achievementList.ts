import type { ActivityStats } from '@/services/activity'

/*
 * ============================================================
 *  업적 · 칭호 목록 (여기만 채우면 앱에 반영된다)
 * ============================================================
 *
 *  ■ 업적 (ACHIEVEMENT_LIST) — 출석 횟수로 달성
 *    goal    : 이만큼 출석하면 달성
 *    bonusXp : 달성하면 더 받는 경험치 (출석 1회 기본 10XP 와 별개)
 *    icon    : 이모지 한 개 (비워 두면 🎲)
 *    name    : 업적 이름 (비워 두면 "출석 5회" 처럼 나온다)
 *
 *  ■ 칭호 (TITLE_LIST) — 조건을 채우면 자동으로 얻는다. 닉네임 앞에 붙는다 ("○○○ 홍길동")
 *    id      : 영문 소문자·숫자·- 만. 회원이 고른 칭호로 저장되니 한 번 정하면 바꾸지 말 것
 *    metric  : 무엇으로 셀지 (아래 표)
 *    goal    : 몇 이상이면 얻는지
 *    text    : 칭호 이름 (비워 두면 그 칭호는 앱에 나오지 않는다)
 *
 *    metric 에 쓸 수 있는 것
 *      attended            모임 출석 횟수
 *      hosted              모임을 연 횟수
 *      posts               게시글 수 (모든 게시판)
 *      reviews             후기 게시판 글 수
 *      memberDays          가입한 지 며칠
 *      longestWeekStreak   몇 주 연속으로 매주 출석했는지 (가장 길었던 기록)
 *      rolls               주사위를 굴린 횟수 (오늘의 주사위 + 출석 주사위)
 *      coinsEarned         지금까지 모은 코인 (가진 코인 + 상점에서 쓴 코인. 써도 줄지 않는다)
 *
 *  줄을 더하거나 지워도 된다. 순서대로 화면에 나온다.
 *  관리자가 직접 주는 칭호는 여기 적지 않고 앱의 관리자 화면에서 준다.
 */

export type AchievementEntry = {
  goal: number
  bonusXp: number
  icon: string
  name: string
}

export type TitleEntry = {
  id: string
  metric: keyof ActivityStats
  goal: number
  text: string
}

export const ACHIEVEMENT_LIST: AchievementEntry[] = [
  { goal: 1, bonusXp: 10, icon: '🎲', name: '첫 턴' },
  { goal: 2, bonusXp: 10, icon: '👋', name: '또 왔어요' },
  { goal: 3, bonusXp: 15, icon: '🃏', name: '세 장의 카드' },
  { goal: 5, bonusXp: 20, icon: '🧩', name: '단골 플레이어' },
  { goal: 7, bonusXp: 25, icon: '🍀', name: '럭키 세븐' },
  { goal: 10, bonusXp: 30, icon: '🏁', name: '열 번째 라운드' },
  { goal: 15, bonusXp: 40, icon: '🎯', name: '보드게임 중독' },
  { goal: 20, bonusXp: 50, icon: '🏠', name: '카페 지박령' },
  { goal: 25, bonusXp: 60, icon: '⭐', name: '반오십' },
  { goal: 30, bonusXp: 70, icon: '🏛️', name: '동호회의 기둥' },
  { goal: 40, bonusXp: 90, icon: '🎖️', name: '노련한 전략가' },
  { goal: 50, bonusXp: 110, icon: '👑', name: '살아있는 전설' },
  { goal: 70, bonusXp: 150, icon: '🏆', name: '명예의 전당' },
  { goal: 100, bonusXp: 200, icon: '💯', name: '백 판의 달인' },
]

export const TITLE_LIST: TitleEntry[] = [
  // 모임을 연 횟수
  { id: 'host-1', metric: 'hosted', goal: 1, text: '용감한' },
  { id: 'host-5', metric: 'hosted', goal: 5, text: '든든한' },
  { id: 'host-20', metric: 'hosted', goal: 20, text: '위대한' },
  // 모임 출석 횟수
  { id: 'attend-10', metric: 'attended', goal: 10, text: '성실한' },
  { id: 'attend-30', metric: 'attended', goal: 30, text: '열정적인' },
  // 게시판
  { id: 'posts-10', metric: 'posts', goal: 10, text: '수다스러운' },
  { id: 'reviews-5', metric: 'reviews', goal: 5, text: '꼼꼼한' },
  // 함께한 시간·꾸준함
  { id: 'year-1', metric: 'memberDays', goal: 365, text: '정다운' },
  { id: 'streak-4', metric: 'longestWeekStreak', goal: 4, text: '꾸준한' },
  // 주사위·코인
  { id: 'dice-30', metric: 'rolls', goal: 30, text: '대담한' },
  { id: 'dice-100', metric: 'rolls', goal: 100, text: '끈질긴' },
  { id: 'coins-300', metric: 'coinsEarned', goal: 300, text: '알뜰한' },
  { id: 'coins-1000', metric: 'coinsEarned', goal: 1000, text: '부유한' },
]
