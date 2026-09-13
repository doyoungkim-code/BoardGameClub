import { onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { create } from 'zustand'
import { channelsCol, dmsCol, readStatesCol, toChannel, toDm } from '@/services/chat'
import type { Channel, DmRoom } from '@/types/chat'

type ChatState = {
  loaded: boolean
  /** order 오름차순 */
  channels: Channel[]
  /** 최근 대화순 */
  dms: DmRoom[]
  /** roomKey → 마지막으로 읽은 시각(ms) */
  readAt: Record<string, number>
}

const initialState: ChatState = { loaded: false, channels: [], dms: [], readAt: {} }

export const useChat = create<ChatState>(() => initialState)

let unsubscribers: (() => void)[] = []
let subscribers = 0

/**
 * 채팅 목록·안 읽음 표시에 필요한 데이터를 앱 전역에서 한 번만 구독한다.
 * (채널 목록, 내 DM 목록, 내 읽음 기록) 반환값을 호출하면 구독 해제.
 */
export function startChatSync(uid: string) {
  subscribers += 1
  if (unsubscribers.length === 0) {
    const pending = new Set(['channels', 'dms', 'readStates'])
    const markLoaded = (part: string) => {
      if (!pending.delete(part)) return
      if (pending.size === 0) useChat.setState({ loaded: true })
    }
    const onError = (part: string) => (error: Error) => {
      console.error(`채팅 ${part} 구독 실패`, error)
      markLoaded(part)
    }

    unsubscribers = [
      onSnapshot(
        channelsCol,
        (snap) => {
          const channels = snap.docs
            .map(toChannel)
            .sort((a, b) => a.order - b.order || (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))
          useChat.setState({ channels })
          markLoaded('channels')
        },
        onError('channels'),
      ),
      onSnapshot(
        query(dmsCol, where('memberIds', 'array-contains', uid)),
        (snap) => {
          const dms = snap.docs
            .map(toDm)
            .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))
          useChat.setState({ dms })
          markLoaded('dms')
        },
        onError('dms'),
      ),
      onSnapshot(
        readStatesCol(uid),
        (snap) => {
          const readAt = Object.fromEntries(
            snap.docs.map((d) => {
              const lastReadAt = d.data({ serverTimestamps: 'estimate' }).lastReadAt as Timestamp | null
              return [d.id, lastReadAt?.toMillis() ?? 0]
            }),
          )
          useChat.setState({ readAt })
          markLoaded('readStates')
        },
        onError('readStates'),
      ),
    ]
  }

  return () => {
    subscribers -= 1
    if (subscribers <= 0) stopChatSync()
  }
}

export function stopChatSync() {
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  unsubscribers = []
  subscribers = 0
  useChat.setState(initialState)
}
