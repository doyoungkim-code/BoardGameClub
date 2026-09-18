import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Navigate, useLocation } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isKakaoInApp, isOtherInApp, openInExternalBrowser } from '@/lib/browser'
import { APP_NAME } from '@/lib/constants'
import { toErrorMessage } from '@/lib/format'
import { signInWithGoogle } from '@/services/auth'
import { useAuth } from '@/stores/auth'

export function LoginPage() {
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const [pending, setPending] = useState(false)

  // 로그인되면 원래 가려던 곳으로. 가입·승인 상태 확인은 AuthGate가 한다.
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const handleLogin = async () => {
    setPending(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error(error)
      toast.error(toErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <div className="space-y-3 text-center">
        <img src="/pwa-192x192.png" alt="" className="mx-auto size-20 rounded-3xl shadow-md" />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">회원 전용 공간이에요. 가입은 운영자 승인 후 이용할 수 있어요.</p>
      </div>
      <InAppBrowserNotice />
      <Button
        size="lg"
        variant="outline"
        className="h-12 w-full max-w-xs gap-3 bg-card"
        onClick={handleLogin}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon />}
        Google 계정으로 시작하기
      </Button>
    </div>
  )
}

/**
 * 카카오톡·인스타그램 등 앱 안 브라우저에서는 구글이 로그인을 막는다 (403 disallowed_useragent).
 * 카톡으로 링크를 받는 경우가 많아서 로그인 전에 안내한다.
 */
function InAppBrowserNotice() {
  if (isKakaoInApp()) {
    return (
      <div className="w-full max-w-xs space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-center text-sm">
        <p>카카오톡 안에서는 구글 로그인이 안 돼요.</p>
        <Button className="w-full" onClick={openInExternalBrowser}>
          <ExternalLink className="size-4" />
          다른 브라우저로 열기
        </Button>
      </div>
    )
  }
  if (isOtherInApp()) {
    return (
      <p className="w-full max-w-xs rounded-xl border border-primary/30 bg-primary/5 p-4 text-center text-sm">
        이 앱 안에서는 구글 로그인이 안 돼요. 오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러주세요.
      </p>
    )
  }
  return null
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}
