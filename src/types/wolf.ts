import type { Timestamp } from 'firebase/firestore'
import type { Info, NightStep, NightEvent } from '@/games/wolf/engine'
import type { RoleId } from '@/games/wolf/roles'

/** wolfRooms/main: 방은 하나 (한자리에 모여 하는 게임) */
export type WolfRoom = {
  hostId: string | null
  /** 들어온 순서대로의 uid (최대 10명) */
  seats: string[]
  readyIds: string[]
  status: 'lobby' | 'playing'
  /** 방장이 고른 카드 구성 (인원 + 3장) */
  roles: RoleId[]
  /** 밤 한 단계 시간(초) */
  stepSec: number
  /** 토론 시간(초) */
  discussSec: number
  gameId: string | null
  updatedAt: Timestamp | null
}

export type WolfPhase = 'deal' | 'night' | 'day' | 'vote' | 'result' | 'aborted'

/** 결과 화면에 모두에게 공개되는 내용 (판이 끝나면 game 문서에 적는다) */
export type WolfResult = {
  /** 자리 순서의 처음 카드·마지막 카드 */
  dealt: RoleId[]
  final: RoleId[]
  /** 가운데 3장의 처음·마지막 */
  centerDealt: RoleId[]
  centerFinal: RoleId[]
  /** 죽은 사람(자리) */
  deaths: number[]
  /** 투표: 자리 → 지목한 자리 (-1 = 안 함) */
  votes: number[]
  winnerIds: string[]
  villageWins: boolean
  werewolfWins: boolean
  log: NightEvent[]
}

/** wolfRooms/main/games/{gameId} */
export type WolfGame = {
  id: string
  hostId: string
  /** 자리 순서 uid */
  players: string[]
  roles: RoleId[]
  steps: NightStep[]
  stepSec: number
  discussSec: number
  phase: WolfPhase
  /** 카드 확인 시작 (서버 시각). 카드 확인 → 밤 단계들 순서로 이어진다 */
  startedAt: Timestamp | null
  dayEndAt: Timestamp | null
  voteEndAt: Timestamp | null
  /** 낮에 "토론 끝" 누른 사람 */
  readyIds: string[]
  result: WolfResult | null
  createdAt: Timestamp | null
}

/** games/{gameId}/private/{uid}: 본인과 방장만 */
export type WolfPrivate = { seat: number; dealt: RoleId; info: Info[] }

/** users/{uid}/wolfGames/{gameId}: 전적 */
export type WolfRecord = { role: RoleId; won: boolean; playedAt: Timestamp | null }
