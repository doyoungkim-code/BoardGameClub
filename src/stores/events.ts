import { onSnapshot, type Timestamp } from 'firebase/firestore'
import { create } from 'zustand'
import { startOfToday, toEvent, upcomingEventsQuery } from '@/services/events'
import type { ClubEvent } from '@/types/event'

type EventsState = {
  loaded: boolean
  /** 오늘 이후 모임, 빠른 순 */
  upcoming: ClubEvent[]
}

const initialState: EventsState = { loaded: false, upcoming: [] }

export const useEvents = create<EventsState>(() => initialState)

let unsubscribe: (() => void) | null = null
let subscribers = 0
let since: Timestamp | null = null

/**
 * 다가오는 모임을 홈·모임 목록이 같이 쓰도록 한 번만 구독한다.
 * 반환값을 호출하면 구독 해제. 날짜가 바뀌면 기준 시각을 다시 잡는다.
 */
export function startEventsSync() {
  subscribers += 1
  const today = startOfToday()
  // 자정을 넘겨 기준일이 바뀌었으면 구독을 새로 건다
  if (unsubscribe && since && since.toMillis() !== today.toMillis()) {
    unsubscribe()
    unsubscribe = null
  }
  if (!unsubscribe) {
    since = today
    unsubscribe = onSnapshot(
      upcomingEventsQuery(today),
      (snap) => useEvents.setState({ loaded: true, upcoming: snap.docs.map(toEvent) }),
      (error) => {
        console.error('모임 목록 구독 실패', error)
        useEvents.setState({ loaded: true })
      },
    )
  }
  return () => {
    subscribers -= 1
    if (subscribers <= 0) stopEventsSync()
  }
}

export function stopEventsSync() {
  unsubscribe?.()
  unsubscribe = null
  subscribers = 0
  since = null
  useEvents.setState(initialState)
}
