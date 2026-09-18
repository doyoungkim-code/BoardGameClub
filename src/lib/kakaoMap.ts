/**
 * 카카오맵 SDK 불러오기와 장소 검색.
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

/** 카카오에서 찾은 보드게임카페 한 곳. id 는 카카오 장소 ID (즐겨찾기 문서 ID 로도 쓴다) */
export type KakaoCafe = {
  id: string
  name: string
  address: string
  phone: string
  lat: number
  lng: number
}

/** 카카오 장소 분류에서 보드게임카페는 "… > 여가시설 > 보드카페 > …" 로 들어 있다 */
const isBoardCafe = (r: kakao.maps.services.PlaceResult) => r.category_name.includes('보드카페')

const toCafe = (r: kakao.maps.services.PlaceResult): KakaoCafe => ({
  id: r.id,
  name: r.place_name,
  address: r.road_address_name || r.address_name,
  phone: r.phone,
  lat: Number(r.y),
  lng: Number(r.x),
})

/** 카카오 검색 한 번당 받을 수 있는 최대 건수 (15건 × 3쪽) */
export const KAKAO_SEARCH_LIMIT = 45

/**
 * 지도에 보이는 영역 안의 보드게임카페를 모두 뽑는다 (최대 45곳).
 * truncated 가 참이면 실제로는 더 있다 → 지도를 확대하면 빠진 곳이 나온다.
 */
export function searchBoardCafesIn(bounds: kakao.maps.LatLngBounds): Promise<{ cafes: KakaoCafe[]; truncated: boolean }> {
  const k = window.kakao
  return new Promise((resolve, reject) => {
    const found: KakaoCafe[] = []
    new k.maps.services.Places().keywordSearch(
      '보드게임카페',
      (result, status, pagination) => {
        if (status === k.maps.services.Status.ZERO_RESULT) return resolve({ cafes: [], truncated: false })
        if (status !== k.maps.services.Status.OK) return reject(new Error('보드게임카페 검색 실패'))
        found.push(...result.filter(isBoardCafe).map(toCafe))
        // 다음 쪽이 있으면 이어서 받는다 (콜백이 다시 불린다)
        if (pagination.hasNextPage) return pagination.nextPage()
        resolve({ cafes: found, truncated: pagination.totalCount > KAKAO_SEARCH_LIMIT })
      },
      { bounds, size: 15 },
    )
  })
}

/** "홍대", "강남역" 같은 지역·장소 이름의 위치. 못 찾으면 null */
export async function findArea(keyword: string): Promise<{ lat: number; lng: number } | null> {
  const k = await loadKakaoMaps()
  return new Promise((resolve, reject) => {
    new k.maps.services.Places().keywordSearch(
      keyword,
      (result, status) => {
        if (status === k.maps.services.Status.ZERO_RESULT) return resolve(null)
        if (status !== k.maps.services.Status.OK) return reject(new Error('지역 검색 실패'))
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
      },
      { size: 1 },
    )
  })
}
