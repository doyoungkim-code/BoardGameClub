import { TITLE_LIST } from '@/data/achievementList'
import type { ActivityStats } from '@/services/activity'

/**
 * 조건을 채우면 자동으로 얻는 칭호. 닉네임 앞에 붙는다 ("번개의 신 홍길동").
 * 이름·조건은 src/data/achievementList.ts 의 TITLE_LIST 에서 고친다.
 * 이름(text)을 비워 둔 칭호는 앱에 나오지 않는다.
 *
 * 관리자가 직접 주는 칭호는 여기 없이 회원 문서(users.grantedTitles)에 'granted:<이름>' 으로 저장된다.
 */
export type AutoTitle = {
  id: string
  text: string
  /** 얻는 조건 설명 (조건으로 자동 생성) */
  description: string
  metric: keyof ActivityStats
  goal: number
}

/** 조건 설명 문장 ("번개 5번 열기") */
function describeCondition(metric: keyof ActivityStats, goal: number) {
  switch (metric) {
    case 'attended':
      return `모임 ${goal}번 출석`
    case 'regularAttended':
      return `정기모임 ${goal}번 출석`
    case 'flashAttended':
      return `번개 ${goal}번 출석`
    case 'hosted':
      return `모임 ${goal}번 열기`
    case 'flashHosted':
      return `번개 ${goal}번 열기`
    case 'posts':
      return `게시글 ${goal}개 쓰기`
    case 'reviews':
      return `후기 ${goal}개 쓰기`
    case 'memberDays':
      return goal % 365 === 0 ? `가입한 지 ${goal / 365}년` : `가입한 지 ${goal}일`
    case 'longestWeekStreak':
      return `${goal}주 연속 매주 출석`
  }
}

export const AUTO_TITLES: AutoTitle[] = TITLE_LIST.filter((entry) => entry.text.trim()).map((entry) => ({
  id: entry.id,
  text: entry.text.trim(),
  description: describeCondition(entry.metric, entry.goal),
  metric: entry.metric,
  goal: entry.goal,
}))

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
