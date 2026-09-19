import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { UserAvatar } from '@/components/UserAvatar'
import { PageSpinner } from '@/components/PageSpinner'
import { RoomNotFound } from '@/features/chat/ChatLayout'
import { ChatRoom } from '@/features/chat/ChatRoom'
import { referrerLabel } from '@/lib/format'
import { openDm, otherMemberId } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import { useChat } from '@/stores/chat'
import { useMembers } from '@/stores/members'

export function DmRoomPage() {
  const { dmId = '' } = useParams()
  const uid = useAuth((s) => s.profile!.uid)
  const chatLoaded = useChat((s) => s.loaded)
  const roomExists = useChat((s) => s.dms.some((d) => d.id === dmId))
  const membersLoaded = useMembers((s) => s.loaded)
  const byId = useMembers((s) => s.byId)

  const participants = dmId.split('_')
  const otherUid = participants.length === 2 && participants.includes(uid) ? otherMemberId(dmId, uid) : null
  const other = otherUid ? byId[otherUid] : undefined

  // 주소로 바로 들어왔는데 방이 아직 없으면 만들어 둔다 (메시지를 보내려면 방 문서가 필요)
  useEffect(() => {
    if (chatLoaded && !roomExists && otherUid && other) {
      openDm(uid, otherUid).catch((error) => console.error('DM 방 만들기 실패', error))
    }
  }, [chatLoaded, roomExists, uid, otherUid, other])

  if (!otherUid) return <RoomNotFound />
  if (!chatLoaded || !membersLoaded) return <PageSpinner />

  const name = other?.nickname ?? '알 수 없는 회원'

  return (
    <ChatRoom
      key={dmId}
      type="dm"
      roomId={dmId}
      title={name}
      subtitle={other ? (referrerLabel(other, byId) ?? undefined) : undefined}
      avatar={
        other ? (
          // 상대 사진을 누르면 프로필로
          <Link to={`/members/${otherUid}`} aria-label={`${name} 프로필`}>
            <UserAvatar name={name} photoURL={other.photoURL} className="size-8" />
          </Link>
        ) : (
          <UserAvatar name={name} photoURL={null} className="size-8" />
        )
      }
      disabledReason={!other ? '지금은 대화할 수 없는 회원이에요' : !roomExists ? '대화방을 준비하고 있어요…' : undefined}
    />
  )
}
