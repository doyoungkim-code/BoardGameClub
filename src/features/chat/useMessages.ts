import { useCallback, useEffect, useMemo, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import {
  fetchMessagesBefore,
  latestMessagesQuery,
  markRoomRead,
  MESSAGE_PAGE_SIZE,
  toMessage,
} from '@/services/chat'
import { useChat } from '@/stores/chat'
import type { ChatMessage, RoomType } from '@/types/chat'

export const messageMillis = (m: ChatMessage) => m.createdAt?.toMillis() ?? Number.MAX_SAFE_INTEGER

/**
 * 최근 50개는 실시간 구독, 그 이전은 필요할 때 50개씩 불러온다.
 * 방이 바뀌면 컴포넌트를 key로 새로 만들어 상태를 초기화한다.
 */
export function useMessages(type: RoomType, roomId: string) {
  const [byId, setById] = useState<Map<string, ChatMessage>>(() => new Map())
  const [loaded, setLoaded] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)

  useEffect(() => {
    let checkedServer = false
    return onSnapshot(
      latestMessagesQuery(type, roomId),
      { includeMetadataChanges: true },
      (snap) => {
        setById((prev) => {
          const next = new Map(prev)
          for (const change of snap.docChanges()) {
            // 'removed'는 새 메시지 때문에 최근 50개 밖으로 밀려난 것. 메시지는 실제로 지우지 않으므로 유지한다.
            if (change.type !== 'removed') next.set(change.doc.id, toMessage(change.doc))
          }
          return next
        })
        setLoaded(true)
        if (!checkedServer && !snap.metadata.fromCache) {
          checkedServer = true
          if (snap.size < MESSAGE_PAGE_SIZE) setHasMore(false)
        }
      },
      (error) => {
        console.error('메시지 구독 실패', error)
        setLoaded(true)
        setHasMore(false)
      },
    )
  }, [type, roomId])

  const messages = useMemo(() => [...byId.values()].sort((a, b) => messageMillis(a) - messageMillis(b)), [byId])

  const oldest = messages[0]
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !oldest?.createdAt) return
    setLoadingOlder(true)
    try {
      const snap = await fetchMessagesBefore(type, roomId, oldest.createdAt)
      setById((prev) => {
        const next = new Map(prev)
        snap.docs.forEach((d) => next.set(d.id, toMessage(d)))
        return next
      })
      if (snap.size < MESSAGE_PAGE_SIZE) setHasMore(false)
    } catch (error) {
      console.error('이전 메시지 불러오기 실패', error)
    } finally {
      setLoadingOlder(false)
    }
  }, [type, roomId, oldest, loadingOlder, hasMore])

  return { messages, loaded, hasMore, loadingOlder, loadOlder }
}

/** 대화방을 보고 있는 동안 새 메시지가 오면 읽음으로 기록한다 */
export function useMarkRead(uid: string, key: string, messages: ChatMessage[]) {
  const readAt = useChat((s) => s.readAt[key])
  const latest = messages.at(-1)
  const latestId = latest?.id
  const latestMs = latest ? messageMillis(latest) : 0
  const latestIsMine = latest?.senderId === uid

  useEffect(() => {
    if (!latestId) return
    if (readAt !== undefined && latestMs <= readAt) return
    // 내가 보낸 메시지는 안 읽음으로 치지 않으므로 기록할 필요 없음
    if (latestIsMine && readAt !== undefined) return

    const mark = () => {
      if (document.visibilityState !== 'visible') return
      markRoomRead(uid, key).catch((error) => console.warn('읽음 기록 실패', error))
    }
    // 메시지가 연달아 올 때 쓰기 횟수를 줄이려고 잠깐 기다렸다가 기록
    const timer = setTimeout(mark, 1000)
    document.addEventListener('visibilitychange', mark)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', mark)
    }
  }, [uid, key, latestId, latestMs, latestIsMine, readAt])
}
