import { Loader2 } from 'lucide-react'

/**
 * 앱을 열 때 로그인 상태를 확인하는 동안.
 * 금방 끝나면 빈 배경만 보이고, 0.3초 넘게 걸릴 때만 아이콘이 부드럽게 나타난다.
 */
export function SplashScreen() {
  return (
    <div className="appear-delayed flex min-h-dvh flex-col items-center justify-center gap-5">
      <img src="/pwa-192x192.png" alt="" className="size-20 rounded-3xl shadow-md" />
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}
