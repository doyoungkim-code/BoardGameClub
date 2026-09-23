import { differenceInCalendarWeeks, startOfWeek } from 'date-fns'
import { getDocs, query, where } from 'firebase/firestore'
import { ATTENDANCE_ACHIEVEMENTS, nextTier, tierFor, xpFor, type Tier } from '@/data/achievements'
import { AUTO_TITLES } from '@/data/titles'
import { eventsCol, hasStarted, toEvent } from '@/services/events'
import { postsCol, toPost } from '@/services/posts'
import type { ClubEvent } from '@/types/event'
import type { PostCategory } from '@/types/post'
import type { UserProfile } from '@/types/user'

/**
 * 업적·칭호 계산에 쓰는 누적 수치 (가입 후 전체 기간).
 * 출석 업적·티어는 attended 로, 자동 칭호(src/data/titles.ts)는 이 이름들 중 하나로 조건을 정한다.
 */
export type ActivityStats = {
  /** 모임 출석 */
  attended: number
  /** 연 모임 */
  hosted: number
  /** 쓴 게시글 (모든 게시판) */
  posts: number
  /** 후기 게시판 글 */
  reviews: number
  /** 가입(승인) 후 지난 날 수 */
  memberDays: number
  /** 가장 길게 이어진 주 단위 연속 출석 (월요일 시작 주마다 한 번 이상 출석) */
  longestWeekStreak: number
}

/** 출석 횟수만으로 정해지는 성장 상태 (티어 배너가 쓰는 값) */
export type AttendanceProgress = {
  attended: number
  xp: number
  tier: Tier
  /** 다음 티어. 챌린저면 null */
  next: Tier | null
  /** 달성한 출석 업적 (goal 값) */
  unlockedGoals: number[]
}

/** 출석 기록으로 계산한 성장 상태 */
export type Progress = AttendanceProgress & {
  /** 조건을 채운 자동 칭호 id */
  earnedAutoIds: Set<string>
}

/**
 * 출석 횟수만으로 계산되는 부분. 홈 배너는 이것만 쓴다
 * (출석 횟수는 stores/progress.ts 에 이미 있어서 Firestore 를 더 읽지 않는다)
 */
export function attendanceProgress(attended: number): AttendanceProgress {
  const xp = xpFor(attended)
  return {
    attended,
    xp,
    tier: tierFor(xp),
    next: nextTier(xp),
    unlockedGoals: ATTENDANCE_ACHIEVEMENTS.filter((a) => attended >= a.goal).map((a) => a.goal),
  }
}

export function progressFor(stats: ActivityStats): Progress {
  return {
    ...attendanceProgress(stats.attended),
    earnedAutoIds: new Set(AUTO_TITLES.filter((t) => stats[t.metric] >= t.goal).map((t) => t.id)),
  }
}

export type XpRank = { member: UserProfile; xp: number; tier: Tier }

/**
 * 경험치 순위. 출석이 없는 회원은 빼고, 같은 경험치면 닉네임 가나다순.
 * attendedById 는 stores/progress.ts 가 들고 있는 값이라 Firestore 를 더 읽지 않는다
 */
export function xpRanking(members: UserProfile[], attendedById: Record<string, number>): XpRank[] {
  return members
    .map((member) => {
      const xp = xpFor(attendedById[member.uid] ?? 0)
      return { member, xp, tier: tierFor(xp) }
    })
    .filter((row) => row.xp > 0)
    .sort((a, b) => b.xp - a.xp || a.member.nickname.localeCompare(b.member.nickname, 'ko'))
}

/** 순위(1등부터). 순위에 없으면(출석 0회) null */
export function rankOf(ranking: XpRank[], uid: string) {
  const index = ranking.findIndex((row) => row.member.uid === uid)
  return index === -1 ? null : index + 1
}

/** 출석한 날짜들에서, 월요일 시작 주 단위로 가장 길게 이어진 주 수 */
export function longestWeekStreak(dates: Date[]) {
  const weekOptions = { weekStartsOn: 1 } as const
  const weeks = [...new Set(dates.map((d) => startOfWeek(d, weekOptions).getTime()))].sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const week of weeks) {
    run = prev !== null && differenceInCalendarWeeks(week, prev, weekOptions) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = week
  }
  return best
}

export type ActivityItem =
  | {
      kind: 'event'
      id: string
      at: number
      title: string
      attended: boolean
      hosted: boolean
    }
  | { kind: 'post'; id: string; at: number; title: string; board: PostCategory }

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
    hosted: hostedEvents.length,
    posts: posts.length,
    reviews: posts.filter((p) => p.board === 'review').length,
    memberDays: joinedAt ? Math.floor((Date.now() - joinedAt) / DAY) : 0,
    longestWeekStreak: longestWeekStreak(attendedEvents.map((e) => e.startAt.toDate())),
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
