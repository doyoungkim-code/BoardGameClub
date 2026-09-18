import type { Timestamp } from 'firebase/firestore'

/** places/{카카오 장소 ID} — 오너가 즐겨찾기한 보드게임카페 */
export type Place = {
  id: string
  name: string
  address: string
  /** 예: "9월 정모 장소, 6인 테이블 있음" */
  memo: string
  lat: number
  lng: number
  createdBy: string
  createdAt: Timestamp | null
}
