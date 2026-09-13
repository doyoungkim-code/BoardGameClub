import { onSnapshot } from 'firebase/firestore'
import { create } from 'zustand'
import { gamesCol, toGame } from '@/services/games'
import type { Game } from '@/types/game'

type GamesState = {
  loaded: boolean
  /** 이름 가나다순 */
  games: Game[]
}

const initialState: GamesState = { loaded: false, games: [] }

export const useGames = create<GamesState>(() => initialState)

let unsubscribe: (() => void) | null = null
let subscribers = 0

/**
 * 게임 목록은 동호회 규모상 많지 않아 한 번에 모두 구독하고,
 * 인원·시간·난이도·태그 필터는 화면에서 건다 (색인도 쿼리도 늘리지 않기 위해).
 */
export function startGamesSync() {
  subscribers += 1
  if (!unsubscribe) {
    unsubscribe = onSnapshot(
      gamesCol,
      (snap) => {
        const games = snap.docs.map(toGame).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        useGames.setState({ loaded: true, games })
      },
      (error) => {
        console.error('게임 목록 구독 실패', error)
        useGames.setState({ loaded: true })
      },
    )
  }
  return () => {
    subscribers -= 1
    if (subscribers <= 0) stopGamesSync()
  }
}

export function stopGamesSync() {
  unsubscribe?.()
  unsubscribe = null
  subscribers = 0
  useGames.setState(initialState)
}
