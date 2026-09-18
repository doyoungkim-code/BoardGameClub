import { create } from 'zustand'
import { isStandalone } from '@/lib/browser'

/** 크롬(안드로이드·PC)이 주는 "설치할 수 있어요" 이벤트 */
export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = {
  /** 있으면 버튼 한 번으로 설치 창을 띄울 수 있다 */
  promptEvent: BeforeInstallPromptEvent | null
  installed: boolean
}

export const useInstall = create<InstallState>(() => ({
  promptEvent: null,
  installed: isStandalone(),
}))

/**
 * 앱 시작 때 한 번 호출 (main.tsx).
 * 설치 가능 이벤트는 페이지가 열릴 때 한 번만 오므로, 설치 안내 화면이 뜨기 전에 미리 받아 둔다.
 */
export function listenInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 브라우저 기본 안내 대신 우리 버튼으로 띄운다
    e.preventDefault()
    useInstall.setState({ promptEvent: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => useInstall.setState({ promptEvent: null, installed: true }))
}

/** 설치 창 띄우기. 설치했으면 true */
export async function promptInstall() {
  const event = useInstall.getState().promptEvent
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  // 이벤트는 한 번만 쓸 수 있다
  useInstall.setState({ promptEvent: null, installed: outcome === 'accepted' })
  return outcome === 'accepted'
}
