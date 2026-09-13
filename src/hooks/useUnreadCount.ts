import { isRoomUnread, roomKey } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import { useChat } from '@/stores/chat'

/** 안 읽은 메시지가 있는 방(채널 + DM) 개수 */
export function useUnreadCount() {
  const profile = useAuth((s) => s.profile)
  const channels = useChat((s) => s.channels)
  const dms = useChat((s) => s.dms)
  const readAt = useChat((s) => s.readAt)

  if (!profile) return 0
  const since = profile.approvedAt?.toMillis() ?? 0
  const unreadChannels = channels.filter((c) => isRoomUnread(c, roomKey('channel', c.id), profile.uid, readAt, since))
  const unreadDms = dms.filter((d) => isRoomUnread(d, roomKey('dm', d.id), profile.uid, readAt, since))
  return unreadChannels.length + unreadDms.length
}
