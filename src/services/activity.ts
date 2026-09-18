import { getDocs, query, where } from 'firebase/firestore'
import { eventsCol, hasStarted, toEvent } from '@/services/events'
import { postsCol, toPost } from '@/services/posts'
import type { ClubEvent, EventType } from '@/types/event'
import type { BoardId } from '@/types/post'

/**
 * 업적 계산에 쓰는 누적 수치 (가입 후 전체 기간).
 * 업적 조건(src/data/achievements.ts)은 이 이름들 중 하나를 골라 목표치를 정한다.
 */
export type ActivityStats = {
  /** 모임 출석 (정기 + 번개) */
  attended: number
  /** 정기모임 출석 */
  regularAttended: number
  /** 번개 출석 */
  flashAttended: number
  /** 연 모임 (정기 + 번개) */
  hosted: number
  /** 연 번개 */
  flashHosted: number
  /** 쓴 게시글 (모든 게시판) */
  posts: number
  /** 후기 게시판 글 */
  reviews: number
  /** 가입(승인) 후 지난 날 수 */
  memberDays: number
}

export type ActivityItem =
  | {
      kind: 'event'
      id: string
      at: number
      title: string
      eventType: EventType
      attended: boolean
      hosted: boolean
    }
  | { kind: 'post'; id: string; at: number; title: string; board: BoardId }

export type MemberActivity = { stats: ActivityStats; history: ActivityItem[] }

/**
 * 이 모임을 출석으로 칠지.
 * 시작했고 취소되지 않은 모임에 참석자로 있어야 하며, 출석 체크를 한 모임이면 체크된 사람만 센다.
 * (출석 체크를 안 한 모임은 참석 신청한 사람을 모두 출석으로 본다)
 */
export function countsAsAttended(event: ClubEvent, uid: string) {
  if (event.canceled || !hasStarted(event) || !event.attendeeIds.includes(uid)) return false
  return event.attendedIds.length === 0 || event.attendedIds.includes(uid)
}

const DAY = 24 * 60 * 60 * 1000

/**
 * 한 회원의 활동 기록 전체를 읽는다.
 * 쿼리 3개 모두 한 필드 조건이라 복합 색인이 필요 없다 (정렬은 화면에서).
 * joinedAt: 가입(승인) 시각(ms). 가입 후 날 수 계산에 쓴다
 */
export async function fetchMemberActivity(uid: string, joinedAt: number | null): Promise<MemberActivity> {
  const [attendSnap, hostSnap, postSnap] = await Promise.all([
    getDocs(query(eventsCol, where('attendeeIds', 'array-contains', uid))),
    getDocs(query(eventsCol, where('hostId', '==', uid))),
    getDocs(query(postsCol, where('authorId', '==', uid))),
  ])

  // 참석한 모임과 연 모임을 합친다 (호스트는 보통 참석자에도 들어 있다)
  const events = new Map<string, ClubEvent>()
  for (const d of [...attendSnap.docs, ...hostSnap.docs]) events.set(d.id, toEvent(d))
  const posts = postSnap.docs.map(toPost)

  const attendedEvents = [...events.values()].filter((e) => countsAsAttended(e, uid))
  const hostedEvents = [...events.values()].filter((e) => e.hostId === uid && !e.canceled && hasStarted(e))

  const stats: ActivityStats = {
    attended: attendedEvents.length,
    regularAttended: attendedEvents.filter((e) => e.type === 'regular').length,
    flashAttended: attendedEvents.filter((e) => e.type === 'flash').length,
    hosted: hostedEvents.length,
    flashHosted: hostedEvents.filter((e) => e.type === 'flash').length,
    posts: posts.length,
    reviews: posts.filter((p) => p.board === 'review').length,
    memberDays: joinedAt ? Math.floor((Date.now() - joinedAt) / DAY) : 0,
  }

  // 활동 기록: 이미 시작한 모임(출석했거나 연 것)과 쓴 글. 최근 것부터
  const history: ActivityItem[] = [
    ...[...events.values()]
      .filter((e) => !e.canceled && hasStarted(e) && (countsAsAttended(e, uid) || e.hostId === uid))
      .map(
        (e): ActivityItem => ({
          kind: 'event',
          id: e.id,
          at: e.startAt.toMillis(),
          title: e.title,
          eventType: e.type,
          attended: countsAsAttended(e, uid),
          hosted: e.hostId === uid,
        }),
      ),
    ...posts.map(
      (p): ActivityItem => ({ kind: 'post', id: p.id, at: p.createdAt?.toMillis() ?? 0, title: p.title, board: p.board }),
    ),
  ].sort((a, b) => b.at - a.at)

  return { stats, history }
}
