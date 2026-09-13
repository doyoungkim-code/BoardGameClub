import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Game, GameOwnership } from '@/types/game'

export const gamesCol = collection(db, 'games')

export const gameRef = (gameId: string) => doc(gamesCol, gameId)

export const toGame = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as Game

export async function fetchGame(gameId: string) {
  const snap = await getDoc(gameRef(gameId))
  return snap.exists() ? toGame(snap) : null
}

export type GameInput = {
  name: string
  altName: string
  minPlayers: number
  maxPlayers: number
  playTimeMin: number | null
  weight: number | null
  tags: string[]
  description: string
  bggUrl: string
  ownership: GameOwnership
  ownerId: string | null
}

export function createGame(uid: string, input: GameInput) {
  const ref = doc(gamesCol)
  return setDoc(ref, {
    ...input,
    borrowerId: null,
    borrowedAt: null,
    createdBy: uid,
    createdAt: serverTimestamp(),
  }).then(() => ref.id)
}

export function updateGame(gameId: string, input: GameInput) {
  return updateDoc(gameRef(gameId), { ...input })
}

export function deleteGame(gameId: string) {
  return deleteDoc(gameRef(gameId))
}

/** 빌리기 / 반납. rules 가 빌리는 사람은 본인만, 반납은 관련자만 허용한다 */
export function setBorrowed(gameId: string, uid: string | null) {
  return updateDoc(gameRef(gameId), {
    borrowerId: uid,
    borrowedAt: uid ? serverTimestamp() : null,
  })
}

// ---------- 화면에서 같이 쓰는 계산 ----------

export const isBorrowed = (game: Game) => game.borrowerId !== null

export const canEditGame = (game: Game, uid: string, isOwner: boolean) => game.createdBy === uid || isOwner

/** 반납 처리를 할 수 있는 사람: 빌린 본인, 개인 소장 게임의 주인, 등록자, 오너 */
export const canReturnGame = (game: Game, uid: string, isOwner: boolean) =>
  game.borrowerId === uid || game.ownerId === uid || canEditGame(game, uid, isOwner)

export const playerRangeText = (game: Game) =>
  game.minPlayers === game.maxPlayers ? `${game.minPlayers}인` : `${game.minPlayers}~${game.maxPlayers}인`

// ---------- 목록 필터 ----------

export type GameFilter = {
  keyword: string
  /** 이 인원으로 즐길 수 있는 게임만. 0 이면 전체 */
  players: number
  /** 이 시간(분) 안에 끝나는 게임만. 0 이면 전체 */
  maxTime: number
  /** 난이도. 0 이면 전체 */
  weight: number
  /** 선택한 태그를 모두 가진 게임만 */
  tags: string[]
  /** 지금 빌려갈 수 있는 게임만 */
  availableOnly: boolean
}

export const EMPTY_FILTER: GameFilter = {
  keyword: '',
  players: 0,
  maxTime: 0,
  weight: 0,
  tags: [],
  availableOnly: false,
}

export const isFilterActive = (filter: GameFilter) =>
  filter.players > 0 || filter.maxTime > 0 || filter.weight > 0 || filter.tags.length > 0 || filter.availableOnly

export function matchesFilter(game: Game, filter: GameFilter) {
  const keyword = filter.keyword.trim().toLowerCase()
  if (keyword && !`${game.name} ${game.altName}`.toLowerCase().includes(keyword)) return false
  if (filter.players && (game.minPlayers > filter.players || game.maxPlayers < filter.players)) return false
  // 시간을 모르는 게임은 시간 조건을 걸면 빠진다
  if (filter.maxTime && (game.playTimeMin === null || game.playTimeMin > filter.maxTime)) return false
  if (filter.weight && game.weight !== filter.weight) return false
  if (filter.tags.some((tag) => !game.tags.includes(tag))) return false
  if (filter.availableOnly && isBorrowed(game)) return false
  return true
}
