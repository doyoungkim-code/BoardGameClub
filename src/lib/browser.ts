/** 지금 브라우저·기기 판별 (홈 화면 앱 설치 안내, 카카오톡 안 브라우저 안내에 쓴다) */

const ua = () => navigator.userAgent

/** 홈 화면에 설치한 앱으로 열려 있는지 */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // 아이폰 Safari 는 이 값으로 알려준다
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** 카카오톡 안 브라우저 (링크를 카톡에서 누르면 여기서 열린다) */
export const isKakaoInApp = () => /KAKAOTALK/i.test(ua())

/** 그 밖의 앱 안 브라우저 (인스타그램, 네이버, 페이스북, 라인, 밴드) */
export const isOtherInApp = () => /Instagram|NAVER\(inapp|FBAN|FBAV|Line\/|BAND\//i.test(ua())

/** 아이폰·아이패드 (최근 아이패드는 맥처럼 보고해서 터치 여부로 가린다) */
export const isIOS = () =>
  /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * 카카오톡 안 브라우저에서 지금 주소를 기본 브라우저(크롬·사파리)로 다시 연다.
 * 카카오톡 안에서는 구글 로그인이 막히고 홈 화면 설치도 안 된다.
 */
export function openInExternalBrowser() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`
}
