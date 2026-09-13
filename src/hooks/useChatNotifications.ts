import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { APP_NAME } from '@/lib/constants'
import { otherMemberId, roomKey } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import { useChat } from '@/stores/chat'
import { useMembers } from '@/stores/members'

/**
 * 서버 푸시 없이 할 수 있는 알림 (Spark 요금제)
 * - 탭 제목에 안 읽은 방 개수 표시
 * - 앱 탭이 열려 있지만 안 보고 있을 때 브라우저 알림 (내 정보에서 권한 허용 시)
 */
export function useChatNotifications() {
  const uid = useAuth((s) => s.profile?.uid)
  const loaded = useChat((s) => s.loaded)
  const channels = useChat((s) => s.channels)
  const dms = useChat((s) => s.dms)
  const byId = useMembers((s) => s.byId)
  const unread = useUnreadCount()
  const navigate = useNavigate()
  const lastSeen = useRef<Map<string, number> | null>(null)

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ${APP_NAME}` : APP_NAME
  }, [unread])

  useEffect(() => () => void (document.title = APP_NAME), [])

  useEffect(() => {
    if (!loaded || !uid) return

    const rooms = [
      ...channels.map((c) => ({ key: roomKey('channel', c.id), path: `/chat/${c.id}`, title: `# ${c.name}`, room: c })),
      ...dms.map((d) => {
        const other = otherMemberId(d.id, uid)
        return { key: roomKey('dm', d.id), path: `/dm/${d.id}`, title: (other && byId[other]?.nickname) || 'DM', room: d }
      }),
    ]
    const previous = lastSeen.current
    lastSeen.current = new Map(rooms.map((r) => [r.key, r.room.lastMessageAt?.toMillis() ?? 0]))

    // 첫 로딩 때는 기존 메시지로 알림을 띄우지 않는다
    if (!previous || !canNotify() || document.visibilityState === 'visible') return

    for (const { key, path, title, room } of rooms) {
      const at = room.lastMessageAt?.toMillis() ?? 0
      if (at <= (previous.get(key) ?? 0) || !room.lastSenderId || room.lastSenderId === uid) continue
      const sender = byId[room.lastSenderId]?.nickname
      const body = key.startsWith('channel') && sender ? `${sender}: ${room.lastMessagePreview}` : room.lastMessagePreview
      try {
        const notification = new Notification(title, { body, tag: key })
        notification.onclick = () => {
          window.focus()
          navigate(path)
          notification.close()
        }
      } catch {
        // 안드로이드 크롬 등 페이지에서 직접 알림을 만들 수 없는 환경
      }
    }
  }, [loaded, uid, channels, dms, byId, navigate])
}

function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted'
}
