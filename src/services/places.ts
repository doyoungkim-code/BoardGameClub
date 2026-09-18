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
import type { KakaoCafe } from '@/lib/kakaoMap'
import type { Place } from '@/types/place'

/** 오너가 즐겨찾기한 보드게임카페. 문서 ID 는 카카오 장소 ID */
export const placesCol = collection(db, 'places')

export const toPlace = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as Place

// ---------- 오너 전용 (rules 가 막는다) ----------

export function addFavorite(uid: string, cafe: KakaoCafe) {
  return setDoc(doc(placesCol, cafe.id), {
    // rules 의 길이 제한에 맞춘다
    name: cafe.name.slice(0, 40),
    address: cafe.address.slice(0, 100),
    memo: '',
    lat: cafe.lat,
    lng: cafe.lng,
    createdBy: uid,
    createdAt: serverTimestamp(),
  })
}

export function updateFavoriteMemo(placeId: string, memo: string) {
  return updateDoc(doc(placesCol, placeId), { memo })
}

export function removeFavorite(placeId: string) {
  return deleteDoc(doc(placesCol, placeId))
}

// ---------- 바깥 지도 앱 연결 ----------

export const kakaoMapUrl = (place: { name: string; lat: number; lng: number }) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`

export const kakaoRouteUrl = (place: { name: string; lat: number; lng: number }) =>
  `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`
