import type { Timestamp } from 'firebase/firestore'

export type RoomType = 'channel' | 'dm'

/** 메시지를 보낼 때 함께 갱신되는 방의 마지막 메시지 정보 */
type RoomLastMessage = {
  lastMessageAt: Timestamp | null
  lastMessagePreview: string
  lastSenderId: string | null
}

/** channels/{channelId} */
export type Channel = RoomLastMessage & {
  id: string
  name: string
  description: string
  order: number
  createdAt: Timestamp | null
  createdBy: string
}

/** dms/{uidA_uidB} */
export type DmRoom = RoomLastMessage & {
  id: string
  memberIds: string[]
  createdAt: Timestamp | null
}

/** channels/{id}/messages/{messageId}, dms/{id}/messages/{messageId} */
export type ChatMessage = {
  id: string
  senderId: string
  /** 보낸 사람이 회원 목록에 없을 때(강퇴 등) 표시용 */
  senderNickname: string
  text: string
  createdAt: Timestamp | null
  deleted: boolean
}
