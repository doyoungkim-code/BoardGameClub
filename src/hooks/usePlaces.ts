import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { placesCol, toPlace } from '@/services/places'
import type { Place } from '@/types/place'

/**
 * 지도에 등록된 장소 전체 (이름순). 카페 수가 많지 않아 한 번에 구독한다.
 * 불러오기 전에는 null.
 */
export function usePlaces() {
  const [places, setPlaces] = useState<Place[] | null>(null)
  useEffect(
    () =>
      onSnapshot(
        placesCol,
        (snap) => setPlaces(snap.docs.map(toPlace).sort((a, b) => a.name.localeCompare(b.name, 'ko'))),
        (error) => {
          console.error('장소 구독 실패', error)
          setPlaces([])
        },
      ),
    [],
  )
  return places
}
