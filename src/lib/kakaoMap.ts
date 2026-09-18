/**
 * 카카오맵 SDK 불러오기.
 * 지도 화면에 들어갈 때 한 번만 스크립트를 붙이고, 이후에는 같은 Promise 를 돌려준다.
 * 키는 .env.production / .env.local 의 VITE_KAKAO_MAP_KEY.
 * 카카오 개발자 콘솔에 등록한 도메인(web.app, firebaseapp.com, localhost:5173)에서만 동작한다.
 */
let loading: Promise<typeof kakao> | null = null

export function loadKakaoMaps(): Promise<typeof kakao> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_KAKAO_MAP_KEY
    if (!key) {
      reject(new Error('VITE_KAKAO_MAP_KEY 가 설정되지 않았어요'))
      return
    }
    const script = document.createElement('script')
    // autoload=false: 스크립트를 받은 뒤 kakao.maps.load 로 직접 초기화한다
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao))
    script.onerror = () => reject(new Error('카카오맵 스크립트를 불러오지 못했어요'))
    document.head.appendChild(script)
  })
  // 실패했으면 다음에 다시 시도할 수 있게 비운다
  loading.catch(() => {
    loading = null
  })
  return loading
}

export type SearchedPlace = {
  name: string
  address: string
  category: string
  lat: number
  lng: number
}

/** 카카오 가게·장소 이름 검색 (예: "레드버튼 강남"). 결과가 없으면 빈 배열 */
export async function searchKakaoPlaces(keyword: string): Promise<SearchedPlace[]> {
  const k = await loadKakaoMaps()
  return new Promise((resolve, reject) => {
    new k.maps.services.Places().keywordSearch(
      keyword,
      (result, status) => {
        if (status === k.maps.services.Status.ZERO_RESULT) return resolve([])
        if (status !== k.maps.services.Status.OK) return reject(new Error('장소 검색 실패'))
        resolve(
          result.map((r) => ({
            name: r.place_name,
            address: r.road_address_name || r.address_name,
            // "가정,생활 > 여가시설 > 보드카페" 에서 마지막 칸만
            category: r.category_name.split('>').at(-1)?.trim() ?? '',
            lat: Number(r.y),
            lng: Number(r.x),
          })),
        )
      },
      { size: 10 },
    )
  })
}
