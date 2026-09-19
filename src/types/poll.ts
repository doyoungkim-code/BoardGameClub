import type { Timestamp } from 'firebase/firestore'

/** 후보 날짜 하나. time 이 '' 이면 시간 미정 */
export type PollOption = {
  id: string
  /** 'yyyy-MM-dd' */
  date: string
  /** 'HH:mm' 또는 '' */
  time: string
}

/**
 * polls/{pollId} — 모임 일정 투표.
 * 회원은 되는 날짜를 모두 고른다(votes[uid] = 후보 id 목록).
 * 만든 사람(또는 오너)이 한 날짜로 모임을 만들면 status 'closed' + eventId
 */
export type Poll = {
  id: string
  title: string
  description: string
  location: string
  options: PollOption[]
  votes: Record<string, string[]>
  createdBy: string
  createdAt: Timestamp | null
  status: 'open' | 'closed'
  eventId: string | null
}
