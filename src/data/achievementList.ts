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
 *      attended            모임 출석 (정모 + 번개)
 *      regularAttended     정기모임 출석
 *      flashAttended       번개 출석
 *      hosted              모임을 연 횟수 (정모 + 번개)
 *      flashHosted         번개를 연 횟수
 *      posts               게시글 수 (모든 게시판)
 *      reviews             후기 게시판 글 수
 *      memberDays          가입한 지 며칠
 *      longestWeekStreak   몇 주 연속으로 매주 출석했는지 (가장 길었던 기록)
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
  { goal: 1, bonusXp: 10, icon: '', name: '' },
  { goal: 2, bonusXp: 10, icon: '', name: '' },
  { goal: 3, bonusXp: 15, icon: '', name: '' },
  { goal: 5, bonusXp: 20, icon: '', name: '' },
  { goal: 7, bonusXp: 25, icon: '', name: '' },
  { goal: 10, bonusXp: 30, icon: '', name: '' },
  { goal: 15, bonusXp: 40, icon: '', name: '' },
  { goal: 20, bonusXp: 50, icon: '', name: '' },
  { goal: 25, bonusXp: 60, icon: '', name: '' },
  { goal: 30, bonusXp: 70, icon: '', name: '' },
  { goal: 40, bonusXp: 90, icon: '', name: '' },
  { goal: 50, bonusXp: 110, icon: '', name: '' },
  { goal: 70, bonusXp: 150, icon: '', name: '' },
  { goal: 100, bonusXp: 200, icon: '', name: '' },
]

export const TITLE_LIST: TitleEntry[] = [
  // 번개를 연 횟수
  { id: 'flash-host-1', metric: 'flashHosted', goal: 1, text: '' },
  { id: 'flash-host-5', metric: 'flashHosted', goal: 5, text: '' },
  { id: 'flash-host-20', metric: 'flashHosted', goal: 20, text: '' },
  // 정기모임·번개 출석
  { id: 'regular-10', metric: 'regularAttended', goal: 10, text: '' },
  { id: 'flash-10', metric: 'flashAttended', goal: 10, text: '' },
  // 게시판
  { id: 'posts-10', metric: 'posts', goal: 10, text: '' },
  { id: 'reviews-5', metric: 'reviews', goal: 5, text: '' },
  // 함께한 시간·꾸준함
  { id: 'year-1', metric: 'memberDays', goal: 365, text: '' },
  { id: 'streak-4', metric: 'longestWeekStreak', goal: 4, text: '' },
]
