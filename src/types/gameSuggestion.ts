import type { Timestamp } from 'firebase/firestore'

/**
 * gameSuggestions/{id} — 회원이 "이 게임 들여 놓으면 좋겠다"고 적어 두는 메모.
 * 오너가 보고 직접 게임 목록(src/data/games.ts)에 넣은 뒤 '넣었음'으로 표시한다
 */
export type GameSuggestion = {
  id: string
  name: string
  /** 몇 명이서 (선택, 예: "2~5명") */
  players: string
  /** 왜 좋은지·링크 등 (선택) */
  note: string
  createdBy: string
  createdAt: Timestamp | null
  /** open: 대기, added: 오너가 목록에 넣음 */
  status: 'open' | 'added'
}
