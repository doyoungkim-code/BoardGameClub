import type { Timestamp } from 'firebase/firestore'

/**
 * events/{eventId} — 이름이 DOM Event 와 겹치지 않게 ClubEvent.
 * 모임은 한 종류다. 예전(2026-09-19 이전)에 만든 문서에는 정기모임·번개를 나누던 type 필드가 남아 있지만 쓰지 않는다.
 */
export type ClubEvent = {
  id: string
  title: string
  description: string
  location: string
  startAt: Timestamp
  /** 없으면 종료 시각 미정 */
  endAt: Timestamp | null
  /** 없으면 인원 제한 없음 */
  capacity: number | null
  hostId: string
  /** 보드게임 목록과 연결할 자리 (아직 화면 없음) */
  gameIds: string[]
  attendeeIds: string[]
  /** 실제로 온 사람. 호스트·오너가 체크 */
  attendedIds: string[]
  canceled: boolean
  createdAt: Timestamp | null
}
