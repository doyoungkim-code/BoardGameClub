import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { eventsCol, newEventData, type EventInput } from '@/services/events'
import type { Poll, PollOption } from '@/types/poll'

export const pollsCol = collection(db, 'polls')

export const pollRef = (pollId: string) => doc(pollsCol, pollId)

export const toPoll = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as Poll

/** 진행 중인 투표 (한 필드 조건이라 색인 불필요, 정렬은 화면에서) */
export const openPollsQuery = () => query(pollsCol, where('status', '==', 'open'))

export async function fetchPoll(pollId: string) {
  const snap = await getDoc(pollRef(pollId))
  return snap.exists() ? toPoll(snap) : null
}

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 10

export type PollInput = {
  title: string
  description: string
  location: string
  options: PollOption[]
}

export function createPoll(uid: string, input: PollInput) {
  const ref = doc(pollsCol)
  return setDoc(ref, {
    ...input,
    votes: {},
    createdBy: uid,
    createdAt: serverTimestamp(),
    status: 'open',
    eventId: null,
  }).then(() => ref.id)
}

/** 내 표 저장. 하나도 안 고르면 내 칸을 지운다 (rules: 자기 칸만) */
export function setMyVote(pollId: string, uid: string, optionIds: string[]) {
  return updateDoc(pollRef(pollId), { [`votes.${uid}`]: optionIds.length > 0 ? optionIds : deleteField() })
}

export function closePoll(pollId: string) {
  return updateDoc(pollRef(pollId), { status: 'closed', eventId: null })
}

export function reopenPoll(pollId: string) {
  return updateDoc(pollRef(pollId), { status: 'open', eventId: null })
}

export function deletePoll(pollId: string) {
  return deleteDoc(pollRef(pollId))
}

/** 고른 날짜로 모임을 만들고 같은 batch 로 투표를 마감한다. 새 모임 id 를 돌려준다 */
export async function createEventFromPoll(uid: string, input: EventInput, pollId: string) {
  const eventRef = doc(eventsCol)
  const batch = writeBatch(db)
  batch.set(eventRef, newEventData(uid, input))
  batch.update(pollRef(pollId), { status: 'closed', eventId: eventRef.id })
  await batch.commit()
  return eventRef.id
}

// ---------- 화면에서 같이 쓰는 계산 ----------

export const canManagePoll = (poll: Poll, uid: string, isOwner: boolean) => poll.createdBy === uid || isOwner

/** 날짜 → 시간 순 (시간 미정은 그날 맨 뒤) */
export const sortOptions = (options: PollOption[]) =>
  [...options].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'))

/** 후보 하나의 시작 시각. 시간 미정이면 저녁 7시로 본다 (모임 만들 때 기본값) */
export function optionDate(option: PollOption) {
  const [hours, minutes] = (option.time || '19:00').split(':').map(Number)
  const date = new Date(`${option.date}T00:00:00`)
  date.setHours(hours, minutes, 0, 0)
  return date
}

/** "9월 27일 (토) 오후 7:00" / 시간 미정이면 "9월 28일 (일)" */
export function optionLabel(option: PollOption) {
  const date = optionDate(option)
  return option.time ? format(date, 'M월 d일 (E) a h:mm', { locale: ko }) : format(date, 'M월 d일 (E)', { locale: ko })
}

/** 후보별로 누가 골랐는지 (투표 뒤 없어진 후보를 고른 표는 버린다) */
export function votersByOption(poll: Poll) {
  const result = new Map<string, string[]>(poll.options.map((o) => [o.id, []]))
  for (const [uid, optionIds] of Object.entries(poll.votes ?? {})) {
    for (const id of optionIds) result.get(id)?.push(uid)
  }
  return result
}

/** 한 번이라도 투표한 사람 수 */
export const voterCount = (poll: Poll) => Object.values(poll.votes ?? {}).filter((ids) => ids.length > 0).length
