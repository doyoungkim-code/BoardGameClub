import type { ActivityStats } from '@/services/activity'

/**
 * 조건을 채우면 자동으로 얻는 칭호. 닉네임 앞에 붙는다 ("번개의 신 홍길동").
 * 이름·조건은 여기만 고치면 된다. id 는 회원이 대표 칭호로 고른 값으로 저장되므로 한 번 정하면 바꾸지 말 것
 * (영문 소문자·숫자·- 만. rules 가 'auto:<id>' 모양을 검사한다).
 *
 * 관리자가 직접 주는 칭호는 여기 없이 회원 문서(users.grantedTitles)에 'granted:<이름>' 으로 저장된다.
 *
 * - metric: 어떤 기록으로 셀지 (services/activity.ts 의 ActivityStats)
 *   attended 출석 / regularAttended 정기모임 출석 / flashAttended 번개 출석
 *   hosted 연 모임 / flashHosted 연 번개 / posts 게시글 / reviews 후기 글
 *   memberDays 가입 후 날 수 / longestWeekStreak 가장 길게 이어진 주 단위 연속 출석
 * - goal: 이 수치 이상이면 획득
 */
export type AutoTitle = {
  id: string
  text: string
  description: string
  metric: keyof ActivityStats
  goal: number
}

// 형용사 칭호(보드게임에 입문한·보드게임을 사랑하는·예리한·꾸준한)는 조건이 정해지면 추가한다
export const AUTO_TITLES: AutoTitle[] = [
  { id: 'flash-host-1', text: '번개 새내기', description: '번개 처음 열기', metric: 'flashHosted', goal: 1 },
  { id: 'flash-host-5', text: '번개맨', description: '번개 5번 열기', metric: 'flashHosted', goal: 5 },
  { id: 'flash-host-20', text: '번개의 신', description: '번개 20번 열기', metric: 'flashHosted', goal: 20 },
  { id: 'regular-10', text: '정모 지킴이', description: '정기모임 10번 출석', metric: 'regularAttended', goal: 10 },
  { id: 'flash-10', text: '번개 사냥꾼', description: '번개 10번 출석', metric: 'flashAttended', goal: 10 },
  { id: 'posts-10', text: '수다쟁이', description: '게시글 10개 쓰기', metric: 'posts', goal: 10 },
  { id: 'reviews-5', text: '후기 장인', description: '후기 게시판에 5번 쓰기', metric: 'reviews', goal: 5 },
  { id: 'year-1', text: '1년 차 보드게이머', description: '가입한 지 1년', metric: 'memberDays', goal: 365 },
  { id: 'streak-4', text: '개근왕', description: '4주 연속 매주 출석', metric: 'longestWeekStreak', goal: 4 },
]

const AUTO_PREFIX = 'auto:'
const GRANTED_PREFIX = 'granted:'

export const autoTitleKey = (title: AutoTitle) => `${AUTO_PREFIX}${title.id}`
export const grantedTitleKey = (text: string) => `${GRANTED_PREFIX}${text}`

/** 관리자가 줄 수 있는 칭호 이름 길이 (rules 의 titleId 40자 제한 안에 들어가게) */
export const MAX_GRANTED_TITLE_LENGTH = 20

/**
 * 대표 칭호 값(titleId)을 화면에 보일 글자로. 지금 가질 수 없는 칭호면 null.
 * earnedAutoIds 를 모르면(다른 회원 목록 등) 자동 칭호는 믿고 보여준다.
 */
export function titleText(
  titleId: string | null | undefined,
  grantedTitles: string[] | undefined,
  earnedAutoIds?: Set<string>,
): string | null {
  if (!titleId) return null
  if (titleId.startsWith(GRANTED_PREFIX)) {
    return grantedTitles?.includes(titleId) ? titleId.slice(GRANTED_PREFIX.length) : null
  }
  if (titleId.startsWith(AUTO_PREFIX)) {
    const id = titleId.slice(AUTO_PREFIX.length)
    if (earnedAutoIds && !earnedAutoIds.has(id)) return null
    return AUTO_TITLES.find((t) => t.id === id)?.text ?? null
  }
  return null
}

/** 수여 칭호 값에서 이름만 */
export const grantedTitleName = (key: string) => key.slice(GRANTED_PREFIX.length)
