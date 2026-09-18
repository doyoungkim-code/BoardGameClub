/**
 * 카카오맵 JavaScript SDK 중 이 앱이 쓰는 부분만 적은 타입.
 * 공식 문서: https://apis.map.kakao.com/web/documentation/
 */
declare global {
  interface Window {
    kakao: typeof kakao
  }

  namespace kakao.maps {
    function load(callback: () => void): void

    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }

    class LatLngBounds {
      constructor()
      extend(latlng: LatLng): void
    }

    type MapOptions = { center: LatLng; level?: number }

    /** level 이 작을수록 확대 (1 ~ 14) */
    class Map {
      constructor(container: HTMLElement, options: MapOptions)
      setCenter(latlng: LatLng): void
      getCenter(): LatLng
      panTo(latlng: LatLng): void
      setLevel(level: number, options?: { animate?: boolean }): void
      getLevel(): number
      setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
      addControl(control: ZoomControl, position: number): void
      relayout(): void
    }

    class ZoomControl {}

    const ControlPosition: { RIGHT: number; TOPRIGHT: number; BOTTOMRIGHT: number }

    type CustomOverlayOptions = {
      position: LatLng
      content: HTMLElement | string
      map?: Map
      /** 0 = 위쪽, 1 = 아래쪽을 좌표에 맞춘다 */
      yAnchor?: number
      xAnchor?: number
      zIndex?: number
      clickable?: boolean
    }

    class CustomOverlay {
      constructor(options: CustomOverlayOptions)
      setMap(map: Map | null): void
    }

    type MouseEvent = { latLng: LatLng }

    namespace event {
      function addListener(target: Map, type: 'click', handler: (event: MouseEvent) => void): void
    }

    namespace services {
      const Status: { OK: string; ZERO_RESULT: string; ERROR: string }

      /** 키워드 검색 결과 한 건. x = 경도(lng), y = 위도(lat) 문자열 */
      type PlaceResult = {
        id: string
        place_name: string
        category_name: string
        address_name: string
        road_address_name: string
        phone: string
        place_url: string
        x: string
        y: string
      }

      class Places {
        constructor()
        keywordSearch(
          keyword: string,
          callback: (result: PlaceResult[], status: string) => void,
          options?: { size?: number; page?: number; location?: LatLng },
        ): void
      }
    }
  }
}

export {}
