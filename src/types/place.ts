import type { Timestamp } from 'firebase/firestore'

/** places/{placeId} — 지도에 찍은 보드게임 카페 */
export type Place = {
  id: string
  name: string
  address: string
  memo: string
  lat: number
  lng: number
  createdBy: string
  createdAt: Timestamp | null
}
