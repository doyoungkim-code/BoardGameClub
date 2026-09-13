import { useMatches } from 'react-router'

/** 라우트 정의의 handle 로 AppShell 레이아웃을 바꾼다 */
export type RouteHandle = {
  /** 'chat': 여백·최대폭 없이 화면 높이를 꽉 채움 (PC에서 목록 + 대화방 2단) */
  layout?: 'chat'
  /** 모바일에서 상단 헤더와 하단 탭을 숨김 (대화방) */
  immersive?: boolean
}

export function useRouteHandle() {
  const matches = useMatches()
  let layout: RouteHandle['layout']
  let immersive = false
  for (const match of matches) {
    const handle = match.handle as RouteHandle | undefined
    if (handle?.layout) layout = handle.layout
    if (handle?.immersive) immersive = true
  }
  return { layout, immersive }
}
