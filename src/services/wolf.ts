import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { deal, nightSteps, recommendedRoles, type ActionKind, type Info, type WolfState } from '@/games/wolf/engine'
import type { RoleId } from '@/games/wolf/roles'
import { db } from '@/lib/firebase'
import type { WolfGame, WolfPhase, WolfPrivate, WolfRecord, WolfResult, WolfRoom } from '@/types/wolf'

/**
 * 「한밤의 늑대」 데이터 (규칙: firestore.rules 의 '한밤의 늑대', 계산: src/games/wolf/engine.ts).
 * 방은 wolfRooms/main 하나. 판마다 games/{gameId} 아래에 비밀(private·actions·votes·secret)을 둔다
 */

export const roomRef = doc(db, 'wolfRooms', 'main')
const gamesCol = collection(roomRef, 'games')
export const gameRef = (gameId: string) => doc(gamesCol, gameId)
const privateRef = (gameId: string, uid: string) => doc(gameRef(gameId), 'private', uid)
export const actionsCol = (gameId: string) => collection(gameRef(gameId), 'actions')
export const votesCol = (gameId: string) => collection(gameRef(gameId), 'votes')
const secretRef = (gameId: string) => doc(gameRef(gameId), 'secret', 'state')
const recordRef = (uid: string, gameId: string) => doc(db, 'users', uid, 'wolfGames', gameId)

const toRoom = (snap: DocumentSnapshot) => (snap.exists() ? (snap.data() as WolfRoom) : null)
const toGame = (snap: DocumentSnapshot) => (snap.exists() ? ({ id: snap.id, ...snap.data() } as WolfGame) : null)

export const DEFAULT_STEP_SEC = 10
export const DEFAULT_DISCUSS_SEC = 300

// ---------- 구독 ----------

export const subscribeRoom = (cb: (room: WolfRoom | null) => void) =>
  onSnapshot(roomRef, (snap) => cb(toRoom(snap)), (error) => console.error('늑대 방 구독 실패', error))

export const subscribeGame = (gameId: string, cb: (game: WolfGame | null) => void) =>
  onSnapshot(gameRef(gameId), (snap) => cb(toGame(snap)), (error) => console.error('늑대 판 구독 실패', error))

export const subscribePrivate = (gameId: string, uid: string, cb: (p: WolfPrivate | null) => void) =>
  onSnapshot(
    privateRef(gameId, uid),
    (snap) => cb(snap.exists() ? (snap.data() as WolfPrivate) : null),
    (error) => console.error('내 카드 구독 실패', error),
  )

// ---------- 대기실 ----------

/** 들어가기. 방이 없으면 만들고 방장이 된다. 방장이 없거나 나가 버렸으면 내가 방장 */
export function joinRoom(uid: string) {
  return runTransaction(db, async (tx) => {
    const room = toRoom(await tx.get(roomRef))
    if (!room) {
      tx.set(roomRef, {
        hostId: uid,
        seats: [uid],
        readyIds: [],
        status: 'lobby',
        roles: recommendedRoles(3),
        stepSec: DEFAULT_STEP_SEC,
        discussSec: DEFAULT_DISCUSS_SEC,
        gameId: null,
        updatedAt: serverTimestamp(),
      })
      return
    }
    if (room.seats.includes(uid)) return
    if (room.status !== 'lobby') throw new Error('playing')
    if (room.seats.length >= 10) throw new Error('full')
    const needHost = !room.hostId || !room.seats.includes(room.hostId)
    tx.update(roomRef, {
      seats: [...room.seats, uid],
      ...(needHost ? { hostId: uid } : {}),
      updatedAt: serverTimestamp(),
    })
  })
}

/** 나가기. 방장이 나가면 남은 첫 사람이 방장 */
export function leaveRoom(uid: string) {
  return runTransaction(db, async (tx) => {
    const room = toRoom(await tx.get(roomRef))
    if (!room || !room.seats.includes(uid)) return
    const seats = room.seats.filter((s) => s !== uid)
    tx.update(roomRef, {
      seats,
      readyIds: room.readyIds.filter((s) => s !== uid),
      hostId: room.hostId === uid ? (seats[0] ?? null) : room.hostId,
      updatedAt: serverTimestamp(),
    })
  })
}

export const setReady = (uid: string, ready: boolean) =>
  updateDoc(roomRef, { readyIds: ready ? arrayUnion(uid) : arrayRemove(uid), updatedAt: serverTimestamp() })

export const claimHost = (uid: string) => updateDoc(roomRef, { hostId: uid, updatedAt: serverTimestamp() })

/** 방장 폰이 꺼져 판이 멈췄을 때: 방을 대기 상태로 되돌리고 내가 방장 */
export const resetRoom = (uid: string) =>
  updateDoc(roomRef, { status: 'lobby', gameId: null, readyIds: [], hostId: uid, updatedAt: serverTimestamp() })

/** 방장: 구성·시간 바꾸기 */
export const updateRoomSettings = (patch: Partial<Pick<WolfRoom, 'roles' | 'stepSec' | 'discussSec'>>) =>
  updateDoc(roomRef, { ...patch, updatedAt: serverTimestamp() })

/** 방장: 내보내기 */
export const kickFromRoom = (uid: string) =>
  updateDoc(roomRef, { seats: arrayRemove(uid), readyIds: arrayRemove(uid), updatedAt: serverTimestamp() })

/** 방장: 판이 끝난 뒤 다시 대기실로 */
export const backToLobby = () =>
  updateDoc(roomRef, { status: 'lobby', gameId: null, readyIds: [], updatedAt: serverTimestamp() })

// ---------- 판 시작 (방장 = 자동 딜러) ----------

/** 딜러 계산 상태 (secret/state). startedSteps = 시작 정보를 이미 나눠 준 밤 단계 수 */
export type WolfSecret = { state: WolfState; startedSteps: number; processed: string[] }

/**
 * 카드를 섞어 나눠 주고 판을 시작한다.
 * ① 판 문서(deal) → ② 각자 처음 카드 + 딜러 상태 + 판 시작(서버 시각) + 방 상태를 한 번에
 */
export async function startGame(room: WolfRoom, hostId: string) {
  const players = room.seats
  const state = deal(room.roles, players.length)
  const ref = doc(gamesCol)
  await setDoc(ref, {
    hostId,
    players,
    roles: room.roles,
    steps: nightSteps(room.roles),
    stepSec: room.stepSec,
    discussSec: room.discussSec,
    phase: 'deal',
    startedAt: null,
    dayEndAt: null,
    voteEndAt: null,
    readyIds: [],
    result: null,
    createdAt: serverTimestamp(),
  })
  const batch = writeBatch(db)
  players.forEach((uid, seat) => {
    batch.set(privateRef(ref.id, uid), { seat, dealt: state.dealt[seat].role, info: [] } satisfies WolfPrivate)
  })
  batch.set(secretRef(ref.id), { state, startedSteps: 0, processed: [] } satisfies WolfSecret)
  batch.update(ref, { phase: 'night', startedAt: serverTimestamp() })
  batch.update(roomRef, { status: 'playing', gameId: ref.id, readyIds: [], updatedAt: serverTimestamp() })
  await batch.commit()
  return ref.id
}

// ---------- 방장 진행 ----------

export async function loadSecret(gameId: string) {
  const snap = await getDoc(secretRef(gameId))
  return snap.exists() ? (snap.data() as WolfSecret) : null
}

export const saveSecret = (gameId: string, secret: WolfSecret) => setDoc(secretRef(gameId), secret)

/** 그 사람이 밤에 알게 된 것을 더한다 */
export const addInfo = (gameId: string, uid: string, info: Info) =>
  updateDoc(privateRef(gameId, uid), { info: arrayUnion(info) })

export const setGamePhase = (
  gameId: string,
  phase: WolfPhase,
  patch: { dayEndAt?: number; voteEndAt?: number; result?: WolfResult } = {},
) =>
  updateDoc(gameRef(gameId), {
    phase,
    ...(patch.dayEndAt ? { dayEndAt: Timestamp.fromMillis(patch.dayEndAt) } : {}),
    ...(patch.voteEndAt ? { voteEndAt: Timestamp.fromMillis(patch.voteEndAt) } : {}),
    ...(patch.result ? { result: patch.result } : {}),
  })

// ---------- 플레이어 ----------

/** 밤 행동 보내기 (같은 행동은 한 번만: 문서 id = uid_종류) */
export const sendAction = (gameId: string, uid: string, kind: ActionKind, targets: number[]) =>
  setDoc(doc(actionsCol(gameId), `${uid}_${kind}`), { uid, kind, targets, at: serverTimestamp() })

export const markDiscussionDone = (gameId: string, uid: string) => updateDoc(gameRef(gameId), { readyIds: arrayUnion(uid) })

export const sendVote = (gameId: string, uid: string, target: string) =>
  setDoc(doc(votesCol(gameId), uid), { target, at: serverTimestamp() })

/** 전적 남기기 (이미 남겼으면 그대로) */
export async function saveRecord(uid: string, gameId: string, role: RoleId, won: boolean) {
  const ref = recordRef(uid, gameId)
  if ((await getDoc(ref)).exists()) return
  await setDoc(ref, { role, won, playedAt: serverTimestamp() } satisfies Record<keyof WolfRecord, unknown>)
}

/** 전적: 판 수·승리 수 (개수 세기 쿼리 2번) */
export async function fetchWolfStats(uid: string) {
  const col = collection(db, 'users', uid, 'wolfGames')
  const [all, wins] = await Promise.all([getCountFromServer(col), getCountFromServer(query(col, where('won', '==', true)))])
  return { played: all.data().count, won: wins.data().count }
}
