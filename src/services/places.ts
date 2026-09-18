import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Place } from '@/types/place'

export const placesCol = collection(db, 'places')

export const toPlace = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as Place

export type PlaceInput = { name: string; address: string; memo: string; lat: number; lng: number }

export function createPlace(uid: string, input: PlaceInput) {
  const ref = doc(placesCol)
  return setDoc(ref, { ...input, createdBy: uid, createdAt: serverTimestamp() }).then(() => ref.id)
}

export function updatePlace(placeId: string, input: PlaceInput) {
  return updateDoc(doc(placesCol, placeId), { ...input })
}

export function deletePlace(placeId: string) {
  return deleteDoc(doc(placesCol, placeId))
}

export const canEditPlace = (place: Place, uid: string, isOwner: boolean) => place.createdBy === uid || isOwner

// ---------- 바깥 지도 앱 연결 ----------
// 우리 지도(OpenStreetMap)는 길찾기가 없어서 카카오맵으로 넘겨준다

export const kakaoMapUrl = (place: Pick<Place, 'name' | 'lat' | 'lng'>) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`

export const kakaoRouteUrl = (place: Pick<Place, 'name' | 'lat' | 'lng'>) =>
  `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`
