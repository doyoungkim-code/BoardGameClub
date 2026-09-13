import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

export function LoginPage() {
  // TODO(2단계): signInWithPopup(auth, googleProvider) 연결, 가입 상태에 따라 이동
  const handleLogin = () => {
    toast.info('구글 로그인은 2단계에서 연결돼요')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <div className="space-y-3 text-center">
        <p className="text-6xl">🎲</p>
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">회원 전용 공간이에요. 가입은 운영자 승인 후 이용할 수 있어요.</p>
      </div>
      <Button size="lg" variant="outline" className="h-12 w-full max-w-xs gap-3 bg-card" onClick={handleLogin}>
        <GoogleIcon />
        Google 계정으로 시작하기
      </Button>
    </div>
  )
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
