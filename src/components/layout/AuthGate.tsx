import { Navigate, Outlet, useLocation } from 'react-router'
import { SplashScreen } from '@/components/SplashScreen'
import { useAuth, useIsOwner } from '@/stores/auth'

/**
 * 로그인·가입 상태에 따라 갈 수 있는 화면을 정한다.
 * 비로그인 → /login, 가입 신청 전 → /signup, 승인 대기·거절·강퇴 → /pending, 승인 → 앱
 */
export function AuthGate() {
  const { initialized, user, profile } = useAuth()
  const { pathname, search } = useLocation()

  if (!initialized) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace state={{ from: pathname + search }} />

  const required = !profile ? '/signup' : profile.status !== 'approved' ? '/pending' : null
  if (required) {
    return pathname === required ? <Outlet /> : <Navigate to={required} replace />
  }
  if (pathname === '/signup' || pathname === '/pending') return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireOwner() {
  const isOwner = useIsOwner()
  return isOwner ? <Outlet /> : <Navigate to="/" replace />
}
