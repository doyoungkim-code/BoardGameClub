import type { ActivityStats } from '@/services/activity'

/**
 * 업적 목록. 여기만 고치면 화면에 바로 반영된다 (저장하는 데이터가 없고 매번 계산한다).
 *
 * - metric: 어떤 수치로 셀지. 고를 수 있는 값은 services/activity.ts 의 ActivityStats 참고
 *   attended 출석 / regularAttended 정기모임 출석 / flashAttended 번개 출석
 *   hosted 연 모임 / flashHosted 연 번개 / posts 게시글 / reviews 후기 글
 *   memberDays 가입 후 날 수
 * - goal: 이 수치 이상이면 달성
 * - 목록 순서대로 화면에 나온다
 */
export type Achievement = {
  id: string
  icon: string
  name: string
  description: string
  metric: keyof ActivityStats
  goal: number
}

export const ACHIEVEMENTS: Achievement[] = [
  // 출석
  { id: 'attend-1', icon: '🎲', name: '첫 발걸음', description: '모임에 처음 출석', metric: 'attended', goal: 1 },
  { id: 'attend-5', icon: '🙌', name: '단골손님', description: '모임 5번 출석', metric: 'attended', goal: 5 },
  { id: 'attend-10', icon: '🔥', name: '개근러', description: '모임 10번 출석', metric: 'attended', goal: 10 },
  { id: 'attend-30', icon: '🏠', name: '터줏대감', description: '모임 30번 출석', metric: 'attended', goal: 30 },
  { id: 'attend-50', icon: '👑', name: '살아있는 전설', description: '모임 50번 출석', metric: 'attended', goal: 50 },
  { id: 'regular-5', icon: '📅', name: '정모 지킴이', description: '정기모임 5번 출석', metric: 'regularAttended', goal: 5 },
  { id: 'flash-5', icon: '⚡', name: '번개 사냥꾼', description: '번개 5번 출석', metric: 'flashAttended', goal: 5 },

  // 모임 열기
  { id: 'host-1', icon: '📣', name: '번개 개시', description: '번개를 처음 열기', metric: 'flashHosted', goal: 1 },
  { id: 'host-5', icon: '🌩️', name: '번개 장인', description: '번개 5번 열기', metric: 'flashHosted', goal: 5 },

  // 게시판
  { id: 'post-1', icon: '✏️', name: '첫 글', description: '게시판에 처음 글쓰기', metric: 'posts', goal: 1 },
  { id: 'post-10', icon: '💬', name: '수다쟁이', description: '게시글 10개 쓰기', metric: 'posts', goal: 10 },
  { id: 'review-3', icon: '📝', name: '후기 작가', description: '후기 게시판에 3번 쓰기', metric: 'reviews', goal: 3 },

  // 함께한 시간
  { id: 'days-100', icon: '💯', name: '100일', description: '가입한 지 100일', metric: 'memberDays', goal: 100 },
  { id: 'days-365', icon: '🎂', name: '1주년', description: '가입한 지 1년', metric: 'memberDays', goal: 365 },
]

export const isUnlocked = (achievement: Achievement, stats: ActivityStats) =>
  stats[achievement.metric] >= achievement.goal
