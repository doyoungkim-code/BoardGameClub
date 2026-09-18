import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ClubEvent } from '@/types/event'

/** 지난 모임 목록에서 한 번에 불러오는 개수 */
export const PAST_PAGE_SIZE = 20

/** 다가오는 모임으로 한 번에 구독하는 최대 개수 (무료 한도 대응) */
const UPCOMING_LIMIT = 50

export const eventsCol = collection(db, 'events')

export const eventRef = (eventId: string) => doc(eventsCol, eventId)

export const toEvent = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as ClubEvent

/**
 * "다가오는 모임"의 기준. 오늘 낮에 있었던 모임도 오늘 안에는 목록에 남도록
 * 지금이 아니라 오늘 0시를 경계로 쓴다.
 */
export function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return Timestamp.fromDate(date)
}

// 복합 색인을 만들지 않으려고 startAt 한 가지로만 정렬·필터하고,
// 취소된 모임 숨김 같은 조건은 화면에서 거른다.

export const upcomingEventsQuery = (from: Timestamp) =>
  query(eventsCol, where('startAt', '>=', from), orderBy('startAt', 'asc'), limit(UPCOMING_LIMIT))

export function fetchPastEvents(before: Timestamp) {
  return getDocs(query(eventsCol, where('startAt', '<', before), orderBy('startAt', 'desc'), limit(PAST_PAGE_SIZE)))
}

export function fetchPastEventsAfter(before: Timestamp, cursor: Timestamp) {
  return getDocs(
    query(
      eventsCol,
      where('startAt', '<', before),
      orderBy('startAt', 'desc'),
      startAfter(cursor),
      limit(PAST_PAGE_SIZE),
    ),
  )
}

export async function fetchEvent(eventId: string) {
  const snap = await getDoc(eventRef(eventId))
  return snap.exists() ? toEvent(snap) : null
}

/** 캘린더에서 보고 있는 달의 모임 */
export function fetchEventsBetween(from: Date, to: Date) {
  return getDocs(
    query(
      eventsCol,
      where('startAt', '>=', Timestamp.fromDate(from)),
      where('startAt', '<=', Timestamp.fromDate(to)),
      orderBy('startAt', 'asc'),
    ),
  )
}

// ---------- 쓰기 ----------

export type EventInput = {
  title: string
  description: string
  location: string
  startAt: Date
  endAt: Date | null
  capacity: number | null
}

/** 모임을 만든 사람은 자동으로 참석자가 된다 (rules 도 이 값을 요구) */
export function createEvent(uid: string, input: EventInput) {
  const ref = doc(eventsCol)
  return setDoc(ref, {
    ...input,
    startAt: Timestamp.fromDate(input.startAt),
    endAt: input.endAt ? Timestamp.fromDate(input.endAt) : null,
    hostId: uid,
    gameIds: [],
    attendeeIds: [uid],
    attendedIds: [],
    canceled: false,
    createdAt: serverTimestamp(),
  }).then(() => ref.id)
}

/** 호스트는 바꿀 수 없다 (rules) */
export function updateEvent(eventId: string, input: EventInput) {
  return updateDoc(eventRef(eventId), {
    title: input.title,
    description: input.description,
    location: input.location,
    startAt: Timestamp.fromDate(input.startAt),
    endAt: input.endAt ? Timestamp.fromDate(input.endAt) : null,
    capacity: input.capacity,
  })
}

export function setEventCanceled(eventId: string, canceled: boolean) {
  return updateDoc(eventRef(eventId), { canceled })
}

export function deleteEvent(eventId: string) {
  return deleteDoc(eventRef(eventId))
}

/** 참석 신청·취소. 본인 uid 하나만 넣고 빼는 것만 rules 가 허용한다 */
export function setAttending(eventId: string, uid: string, attending: boolean) {
  return updateDoc(eventRef(eventId), {
    attendeeIds: attending ? arrayUnion(uid) : arrayRemove(uid),
  })
}

/**
 * 오너 전용: 참석자를 통째로 바꾼다 (지난 모임 기록 정리용).
 * rules 가 출석자는 참석자 안에 있어야 한다고 검사하므로 둘을 같이 넘긴다.
 */
export function setAttendeesByOwner(eventId: string, attendeeIds: string[], attendedIds: string[]) {
  return updateDoc(eventRef(eventId), { attendeeIds, attendedIds })
}

/** 출석 체크 (호스트·오너) */
export function setAttended(eventId: string, uid: string, attended: boolean) {
  return updateDoc(eventRef(eventId), {
    attendedIds: attended ? arrayUnion(uid) : arrayRemove(uid),
  })
}

// ---------- 화면에서 같이 쓰는 계산 ----------

export const isFull = (event: ClubEvent) =>
  event.capacity !== null && event.attendeeIds.length >= event.capacity

/** 목록에서 "지난 모임"으로 보내는 기준 (오늘 낮 모임은 오늘 안에는 지나지 않은 것으로 본다) */
export const isPast = (event: ClubEvent) => event.startAt.toMillis() < startOfToday().toMillis()

/** 이미 시작한 모임. 출석 체크는 이때부터 가능 */
export const hasStarted = (event: ClubEvent) => event.startAt.toMillis() <= Date.now()

export const canManage = (event: ClubEvent, uid: string, isOwner: boolean) => event.hostId === uid || isOwner
