import { Download, EllipsisVertical, ExternalLink, Share, SquarePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { isIOS, isKakaoInApp, isOtherInApp, openInExternalBrowser } from '@/lib/browser'
import { promptInstall, useInstall } from '@/stores/install'

type Props = {
  /** 있으면 오른쪽 위에 닫기 버튼 */
  onDismiss?: () => void
}

/**
 * 홈 화면에 앱 설치하기 안내. 이미 앱으로 열려 있으면 아무것도 안 그린다.
 * 기기마다 방법이 달라서 나눠 보여준다.
 */
export function InstallAppCard({ onDismiss }: Props) {
  const { promptEvent, installed } = useInstall()
  if (installed) return null

  return (
    <Card className="relative border-primary/30 bg-primary/5 py-4">
      <CardContent className="space-y-3 px-4">
        <div className="flex items-center gap-3 pr-6">
          <img src="/pwa-64x64.png" alt="" className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="font-semibold">앱으로 설치하기</p>
            <p className="text-xs text-muted-foreground">홈 화면 아이콘으로 바로 열고, 주소창 없이 넓게 써요</p>
          </div>
        </div>
        <Guide hasPrompt={!!promptEvent} />
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-7"
            onClick={onDismiss}
            aria-label="설치 안내 닫기"
          >
            <X className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function Guide({ hasPrompt }: { hasPrompt: boolean }) {
  // 카카오톡 안: 설치도, 구글 로그인도 안 된다 → 기본 브라우저로 다시 열기
  if (isKakaoInApp()) {
    return (
      <div className="space-y-2">
        <p className="text-sm">카카오톡 안에서는 설치할 수 없어요. 기본 브라우저로 열어서 설치해 주세요.</p>
        <Button className="w-full" onClick={openInExternalBrowser}>
          <ExternalLink className="size-4" />
          다른 브라우저로 열기
        </Button>
      </div>
    )
  }

  if (isOtherInApp()) {
    return (
      <p className="text-sm">
        앱 안 브라우저에서는 설치할 수 없어요. 오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>를 누른 뒤 설치해 주세요.
      </p>
    )
  }

  // 크롬(안드로이드·PC): 버튼 한 번
  if (hasPrompt) {
    return (
      <Button
        className="w-full"
        onClick={async () => {
          if (await promptInstall()) toast.success('설치했어요! 홈 화면에서 열어보세요')
        }}
      >
        <Download className="size-4" />앱 설치
      </Button>
    )
  }

  // 아이폰: 공유 → 홈 화면에 추가 (Safari, iOS 16.4 이상 크롬도 같다)
  if (isIOS()) {
    return (
      <ol className="space-y-1.5 text-sm">
        <Step n={1}>
          화면 아래(또는 위)의 <Share className="inline size-4 align-text-bottom text-primary" /> <b>공유</b> 버튼
        </Step>
        <Step n={2}>
          <SquarePlus className="inline size-4 align-text-bottom text-primary" /> <b>홈 화면에 추가</b>
        </Step>
        <Step n={3}>
          오른쪽 위 <b>추가</b>
        </Step>
      </ol>
    )
  }

  // 그 밖 (설치 버튼이 아직 준비 안 된 안드로이드, 삼성 인터넷, PC 등)
  return (
    <p className="text-sm">
      브라우저 메뉴 <EllipsisVertical className="inline size-4 align-text-bottom" />에서 <b>앱 설치</b> 또는{' '}
      <b>홈 화면에 추가</b>를 눌러주세요.
    </p>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}
