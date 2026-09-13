import type { Timestamp } from 'firebase/firestore'

/** club: 동호회 공용 / member: 회원 개인 소장 */
export type GameOwnership = 'club' | 'member'

/** games/{gameId} */
export type Game = {
  id: string
  name: string
  /** 원제 등 다른 이름 */
  altName: string
  minPlayers: number
  maxPlayers: number
  /** 분. 모르면 null */
  playTimeMin: number | null
  /** 난이도 1~5. 모르면 null */
  weight: number | null
  tags: string[]
  description: string
  bggUrl: string
  ownership: GameOwnership
  /** ownership === 'member' 일 때 소유 회원 uid */
  ownerId: string | null
  /** 빌려간 회원. 없으면 보관 중 */
  borrowerId: string | null
  borrowedAt: Timestamp | null
  createdBy: string
  createdAt: Timestamp | null
}

export const WEIGHT_LABEL: Record<number, string> = {
  1: '아주 가벼움',
  2: '가벼움',
  3: '보통',
  4: '무거움',
  5: '아주 무거움',
}

/** 태그는 자유 입력이지만 자주 쓰는 것을 버튼으로 제안한다 */
export const SUGGESTED_TAGS = [
  '파티',
  '전략',
  '가족',
  '추리',
  '협력',
  '덱빌딩',
  '워게임',
  '2인용',
  '초보용',
]
