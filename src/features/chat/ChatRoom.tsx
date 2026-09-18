import { useCallback, type ReactNode } from 'react'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'
import { Composer } from '@/features/chat/Composer'
import { MessageList } from '@/features/chat/MessageList'
import { useMarkRead, useMessages } from '@/features/chat/useMessages'
import { toErrorMessage } from '@/lib/format'
import { deleteMessage, isRoomLastMessage, roomKey, sendMessage } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import { useChat } from '@/stores/chat'
import { useMembers } from '@/stores/members'
import type { ChatMessage, RoomType } from '@/types/chat'

type Props = {
  type: RoomType
  roomId: string
  title: string
  subtitle?: string
  avatar?: ReactNode
  actions?: ReactNode
  /** 값이 있으면 입력창 대신 이 안내문을 보여준다 */
  disabledReason?: string
}

export function ChatRoom({ type, roomId, title, subtitle, avatar, actions, disabledReason }: Props) {
  const profile = useAuth((s) => s.profile)!
  const membersById = useMembers((s) => s.byId)
  const room = useChat((s) => (type === 'channel' ? s.channels : s.dms).find((r) => r.id === roomId))
  const { messages, loaded, hasMore, loadingOlder, loadOlder } = useMessages(type, roomId)

  useMarkRead(profile.uid, roomKey(type, roomId), messages)

  const handleSend = (text: string) => {
    sendMessage(type, roomId, { uid: profile.uid, nickname: profile.nickname }, text).catch((error) => {
      console.error('메시지 전송 실패', error)
      toast.error(`메시지를 보내지 못했어요. ${toErrorMessage(error)}`)
    })
  }

  // 채널에서는 오너가 모든 메시지를, DM에서는 본인 메시지만 삭제
  const canDelete = useCallback(
    (message: ChatMessage) => message.senderId === profile.uid || (type === 'channel' && profile.role === 'owner'),
    [profile.uid, profile.role, type],
  )

  const handleDelete = (message: ChatMessage) => {
    if (!window.confirm('메시지를 삭제할까요?')) return
    deleteMessage(type, roomId, message.id, isRoomLastMessage(room, message)).catch((error) =>
      toast.error(toErrorMessage(error)),
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background md:h-auto md:min-h-0 md:flex-1">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 md:px-4">
        <BackButton fallback="/chat" className="md:hidden" />
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </header>

      <MessageList
        messages={messages}
        loaded={loaded}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        myUid={profile.uid}
        membersById={membersById}
        canDelete={canDelete}
        onDelete={handleDelete}
        emptyText="첫 메시지를 남겨보세요 👋"
      />

      {disabledReason ? (
        <p className="pb-safe shrink-0 border-t px-4 py-4 text-center text-sm text-muted-foreground">{disabledReason}</p>
      ) : (
        <Composer onSend={handleSend} />
      )}
    </div>
  )
}
