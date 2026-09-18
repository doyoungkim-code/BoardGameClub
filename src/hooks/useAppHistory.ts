import { useEffect } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'
import { toast } from 'sonner'
import { isStandalone } from '@/lib/browser'

/**
 * 뒤로가기를 앱처럼 동작하게 한다.
 *
 * 방문 기록을 항상 이런 모양으로 유지한다.
 *   브라우저:     [홈, 탭, 그 안의 화면...]
 *   설치한 앱:    [홈, 종료 방지(홈), 탭, 그 안의 화면...]
 * - 하단 탭끼리 옮길 때는 기록을 쌓지 않고 바꿔 끼운다 → 어느 탭에서든 뒤로가기 = 홈
 * - 설치한 앱에서 홈 뒤로가기 → 종료 방지 기록이 빠지며 "한 번 더 누르면 종료" 안내
 *   → 한 번 더 누르면 돌아갈 기록이 없어서 휴대폰이 앱을 닫는다
 *
 * 크롬(안드로이드)은 사용자가 화면을 누르지 않은 채 추가된 기록을 뒤로가기에서 건너뛴다
 * (뒤로가기를 가두는 페이지를 막는 정책). 그래서 종료 방지 기록은 앱이 열릴 때가 아니라
 * **사용자가 화면을 누를 때** 건다. 앱을 열자마자 아무것도 안 누르고 뒤로가기를 누르면 한 번에 닫힌다.
 */

/** 이 앱 안에서 지금이 몇 번째 기록인지 (0 = 앱을 연 첫 화면). react-router 가 history.state.idx 에 적어 둔다 */
export function historyIndex(): number {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx
  return typeof idx === 'number' ? idx : 0
}

/** 설치한 앱으로 열렸는지 (세션 동안 바뀌지 않는다) */
const standalone = isStandalone()

/**
 * 종료 방지 기록이 홈 위에 걸려 있는지.
 * 새로고침(새 버전 적용 등)으로 다시 시작해도 기록은 남아 있으므로, 첫 칸이 아니면 걸려 있다고 본다
 */
let guardArmed = standalone && historyIndex() >= 1

/** 홈이 있는 기록 위치 (설치한 앱에서 종료 방지가 걸려 있으면 그 칸) */
const homeIndex = () => (standalone && guardArmed ? 1 : 0)

/** 뒤로 여러 칸 간 뒤 도착하면 마저 옮길 탭 (탭 이동이 두 단계로 나뉠 때) */
let pendingTab: string | null = null

/** 하단 탭·사이드바 탭·앱 이름으로 이동. 기록을 쌓지 않는다 */
export function useTabNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (to: string) => {
    const idx = historyIndex()
    const home = homeIndex()

    if (to === '/') {
      if (idx > home) {
        // 홈 칸까지 한 번에 돌아간다. 그 칸이 홈이 아니면(주소로 바로 들어온 경우) 도착 후 바꿔 끼운다
        pendingTab = '/'
        navigate(-(idx - home))
      } else if (pathname !== '/') {
        navigate('/', { replace: true })
      }
      return
    }

    if (pathname === to) return
    const tabSlot = home + 1
    if (idx < tabSlot) {
      // 홈 위에 쌓는다
      navigate(to)
    } else if (idx === tabSlot) {
      // 탭끼리는 바꿔 끼운다
      navigate(to, { replace: true })
    } else {
      // 탭 안 깊은 화면이면 탭 칸까지 돌아간 뒤 바꿔 끼운다
      pendingTab = to
      navigate(-(idx - tabSlot))
    }
  }
}

/** 앱 전체에서 한 번 (AppShell) */
export function useAppHistory() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const navigate = useNavigate()

  // 탭 이동 마무리 + 홈에서 뒤로가기를 눌렀을 때 안내
  useEffect(() => {
    if (pendingTab !== null) {
      const target = pendingTab
      pendingTab = null
      if (target !== '/') {
        navigate(target, { replace: true })
        return
      }
      if (location.pathname !== '/') {
        navigate('/', { replace: true })
        return
      }
    }

    // 종료 방지 칸에서 뒤로가기로 첫 칸에 내려왔다 = 홈에서 뒤로가기를 한 번 눌렀다
    if (standalone && guardArmed && navigationType === 'POP' && location.pathname === '/' && historyIndex() === 0) {
      guardArmed = false
      toast('한 번 더 누르면 종료돼요', { id: 'exit-guard', duration: 2000 })
    }
  }, [location.key, location.pathname, navigationType, navigate])

  // 사용자가 화면을 누를 때 종료 방지를 건다 (크롬이 인정하는 기록이 되도록)
  useEffect(() => {
    if (!standalone) return
    const arm = () => {
      if (guardArmed || historyIndex() !== 0 || window.location.pathname !== '/') return
      guardArmed = true
      navigate('/', { state: { exitGuard: true } })
    }
    // 터치는 손을 뗄 때(pointerup), 키보드는 keydown 이 "사용자가 눌렀다"로 인정된다.
    // capture 로 받아서 링크 클릭보다 먼저 건다
    window.addEventListener('pointerup', arm, true)
    window.addEventListener('keydown', arm, true)
    return () => {
      window.removeEventListener('pointerup', arm, true)
      window.removeEventListener('keydown', arm, true)
    }
  }, [navigate])
}
