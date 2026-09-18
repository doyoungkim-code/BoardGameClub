import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { isStandalone } from '@/lib/browser'

/**
 * 뒤로가기를 앱처럼 동작하게 한다.
 *
 * 방문 기록을 항상 [홈, 탭, 그 안의 화면...] 모양으로 유지한다.
 * - 하단 탭끼리 옮길 때는 기록을 쌓지 않고 바꿔 끼운다 → 어느 탭에서든 뒤로가기 = 홈
 * - 홈(앱의 첫 기록) 위에 "종료 방지" 기록을 하나 올려 둔다 (설치한 앱에서만).
 *   홈에서 뒤로가기 → 그 기록이 빠지며 "한 번 더 누르면 종료" 안내 → 2초 안에 한 번 더 누르면
 *   더 돌아갈 기록이 없어서 휴대폰이 앱을 닫는다
 */

/** 이 앱 안에서 지금이 몇 번째 기록인지 (0 = 앱을 연 첫 화면). react-router 가 history.state.idx 에 적어 둔다 */
export function historyIndex(): number {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx
  return typeof idx === 'number' ? idx : 0
}

type GuardState = { exitGuard?: boolean } | null

/** 뒤로 여러 칸 간 뒤 도착하면 마저 옮길 탭 (탭 이동이 두 단계로 나뉠 때) */
let pendingTab: string | null = null

/** 하단 탭·사이드바 탭 이동. 기록을 쌓지 않는다 */
export function useTabNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (to: string) => {
    if (pathname === to) return
    const idx = historyIndex()

    if (to === '/') {
      if (idx === 0) {
        navigate('/', { replace: true })
      } else {
        // 앱 첫 기록(홈)까지 한 번에 돌아간다. 첫 기록이 홈이 아니면 도착 후 홈으로 바꿔 끼운다
        pendingTab = '/'
        navigate(-idx)
      }
      return
    }

    if (idx === 0) {
      // 홈 위에 쌓는다
      navigate(to)
    } else if (idx === 1) {
      // 탭 자리(또는 종료 방지 기록)를 바꿔 끼운다
      navigate(to, { replace: true })
    } else {
      // 탭 안 깊은 화면이면 탭 자리까지 돌아간 뒤 바꿔 끼운다
      pendingTab = to
      navigate(-(idx - 1))
    }
  }
}

/** 앱 전체에서 한 번 (AppShell) */
export function useAppHistory() {
  const location = useLocation()
  const navigate = useNavigate()
  const prevState = useRef<GuardState>(null)
  const standalone = useRef(isStandalone())

  useEffect(() => {
    const cameFromGuard = prevState.current?.exitGuard === true
    prevState.current = location.state as GuardState

    // 탭 이동을 마저 끝낸다
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
      // 홈에 도착했으면 아래 종료 방지를 이어서 건다
    }

    // 여기부터는 설치한 앱에서만: 홈에서 뒤로가기 두 번 = 종료
    if (!standalone.current || location.pathname !== '/' || historyIndex() !== 0) return

    const armGuard = () => navigate('/', { state: { exitGuard: true } })
    if (!cameFromGuard) {
      armGuard()
      return
    }
    toast('한 번 더 누르면 종료돼요', { id: 'exit-guard', duration: 2000 })
    // 2초 안에 다시 누르지 않으면 다시 막아 둔다
    const timer = setTimeout(armGuard, 2000)
    return () => clearTimeout(timer)
    // location.key: 같은 주소라도 기록이 바뀌면 다시 확인한다
  }, [location.key, location.pathname, location.state, navigate])
}
