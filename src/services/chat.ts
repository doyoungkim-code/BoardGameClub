import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  deleteDoc,
  writeBatch,
  type DocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Channel, ChatMessage, DmRoom, RoomType } from '@/types/chat'

export const MESSAGE_PAGE_SIZE = 50
export const MAX_MESSAGE_LENGTH = 2000

export const channelsCol = collection(db, 'channels')
export const dmsCol = collection(db, 'dms')
export const readStatesCol = (uid: string) => collection(db, 'users', uid, 'readStates')

const roomRef = (type: RoomType, roomId: string) => doc(db, type === 'channel' ? 'channels' : 'dms', roomId)

export const messagesCol = (type: RoomType, roomId: string) => collection(roomRef(type, roomId), 'messages')

/** readStates 문서 ID */
export const roomKey = (type: RoomType, roomId: string) => `${type}_${roomId}`

// 아직 서버 시간이 확정되지 않은(보내는 중인) 값은 로컬 추정치로 채운다
const estimate = { serverTimestamps: 'estimate' } as const

export const toChannel = (snap: DocumentSnapshot) => ({ id: snap.id, ...snap.data(estimate) }) as Channel
export const toDm = (snap: DocumentSnapshot) => ({ id: snap.id, ...snap.data(estimate) }) as DmRoom
export const toMessage = (snap: DocumentSnapshot) => ({ id: snap.id, ...snap.data(estimate) }) as ChatMessage

// ---------- 안 읽음 ----------

/**
 * 다른 사람이 보낸 마지막 메시지가 내가 마지막으로 읽은 시각보다 뒤면 안 읽음.
 * 읽은 기록이 없는 방은 가입 승인 시각(since)을 기준으로 한다.
 */
export function isRoomUnread(
  room: { lastMessageAt: Timestamp | null; lastSenderId: string | null },
  key: string,
  uid: string,
  readAt: Record<string, number>,
  since: number,
) {
  if (!room.lastMessageAt || !room.lastSenderId || room.lastSenderId === uid) return false
  return room.lastMessageAt.toMillis() > (readAt[key] ?? since)
}

export function markRoomRead(uid: string, key: string) {
  return setDoc(doc(readStatesCol(uid), key), { lastReadAt: serverTimestamp() })
}

// ---------- 채널 (오너 전용) ----------

export type ChannelInput = { name: string; description: string }

export function createChannel(uid: string, input: ChannelInput, order: number) {
  return setDoc(doc(channelsCol), {
    ...input,
    order,
    createdAt: serverTimestamp(),
    createdBy: uid,
    lastMessageAt: null,
    lastMessagePreview: '',
    lastSenderId: null,
  })
}

const DEFAULT_CHANNELS: ChannelInput[] = [
  { name: '전체', description: '동호회 전체 대화방' },
  { name: '모임', description: '오늘 한 판? 모임 잡기' },
  { name: '잡담', description: '보드게임 얘기도, 사는 얘기도' },
]

export function createDefaultChannels(uid: string) {
  const batch = writeBatch(db)
  DEFAULT_CHANNELS.forEach((input, order) => {
    batch.set(doc(channelsCol), {
      ...input,
      order,
      createdAt: serverTimestamp(),
      createdBy: uid,
      lastMessageAt: null,
      lastMessagePreview: '',
      lastSenderId: null,
    })
  })
  return batch.commit()
}

export function updateChannel(channelId: string, input: ChannelInput) {
  return updateDoc(doc(channelsCol, channelId), { ...input })
}

export function deleteChannel(channelId: string) {
  return deleteDoc(doc(channelsCol, channelId))
}

// ---------- DM ----------

/** 두 uid를 정렬해 이어 붙인 값이 DM 방 ID (같은 두 사람은 항상 같은 방) */
export const dmIdFor = (a: string, b: string) => [a, b].sort().join('_')

export const otherMemberId = (dmId: string, me: string) => dmId.split('_').find((id) => id !== me) ?? null

/** 방이 있으면 그대로, 없으면 만들어서 방 ID를 돌려준다 */
export async function openDm(me: string, other: string) {
  const dmId = dmIdFor(me, other)
  const ref = doc(dmsCol, dmId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      memberIds: [me, other].sort(),
      createdAt: serverTimestamp(),
      lastMessageAt: null,
      lastMessagePreview: '',
      lastSenderId: null,
    })
  }
  return dmId
}

// ---------- 메시지 ----------

const toPreview = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 100)

export function sendMessage(
  type: RoomType,
  roomId: string,
  sender: { uid: string; nickname: string },
  text: string,
) {
  const batch = writeBatch(db)
  batch.set(doc(messagesCol(type, roomId)), {
    senderId: sender.uid,
    senderNickname: sender.nickname,
    text,
    createdAt: serverTimestamp(),
    deleted: false,
  })
  batch.update(roomRef(type, roomId), {
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: toPreview(text),
    lastSenderId: sender.uid,
  })
  return batch.commit()
}

/** 마지막 메시지를 지웠을 때 목록에 남는 미리보기 (rules 도 이 값만 허용) */
export const DELETED_PREVIEW = '삭제된 메시지'

/** 방 목록의 미리보기가 이 메시지 것인지 */
export const isRoomLastMessage = (
  room: { lastMessageAt: Timestamp | null; lastSenderId: string | null } | undefined,
  message: ChatMessage,
) =>
  !!room?.lastMessageAt &&
  room.lastSenderId === message.senderId &&
  room.lastMessageAt.toMillis() === (message.createdAt?.toMillis() ?? -1)

export function deleteMessage(type: RoomType, roomId: string, messageId: string, clearPreview: boolean) {
  const messageRef = doc(messagesCol(type, roomId), messageId)
  if (!clearPreview) return updateDoc(messageRef, { deleted: true, text: '' })

  // 방금 지운 게 마지막 메시지면 목록 미리보기도 같이 지운다 (시각·보낸사람은 그대로)
  const batch = writeBatch(db)
  batch.update(messageRef, { deleted: true, text: '' })
  batch.update(roomRef(type, roomId), { lastMessagePreview: DELETED_PREVIEW })
  return batch.commit()
}

export const latestMessagesQuery = (type: RoomType, roomId: string) =>
  query(messagesCol(type, roomId), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE_SIZE))

export function fetchMessagesBefore(type: RoomType, roomId: string, before: Timestamp) {
  return getDocs(
    query(messagesCol(type, roomId), orderBy('createdAt', 'desc'), startAfter(before), limit(MESSAGE_PAGE_SIZE)),
  )
}
