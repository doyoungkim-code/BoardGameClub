import type { Timestamp } from 'firebase/firestore'

/** regular: 오너가 여는 정기모임 / flash: 회원 누구나 여는 번개 */
export type EventType = 'regular' | 'flash'

/** events/{eventId} — 이름이 DOM Event 와 겹치지 않게 ClubEvent */
export type ClubEvent = {
  id: string
  type: EventType
  title: string
  description: string
  location: string
  startAt: Timestamp
  /** 없으면 종료 시각 미정 */
  endAt: Timestamp | null
  /** 없으면 인원 제한 없음 */
  capacity: number | null
  hostId: string
  /** 5단계에서 보드게임 라이브러리와 연결 */
  gameIds: string[]
  attendeeIds: string[]
  /** 실제로 온 사람. 호스트·오너가 체크 */
  attendedIds: string[]
  canceled: boolean
  createdAt: Timestamp | null
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  regular: '정기모임',
  flash: '번개',
}
