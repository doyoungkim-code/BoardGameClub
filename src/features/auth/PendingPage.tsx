import { Clock, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APP_NAME } from '@/lib/constants'
import { signOutUser } from '@/services/auth'
import { useAuth } from '@/stores/auth'

const MESSAGES = {
  pending: {
    title: '가입 승인을 기다리고 있어요',
    description: '운영자가 승인하면 이 화면이 자동으로 바뀌어요.',
  },
  rejected: {
    title: '가입이 승인되지 않았어요',
    description: '궁금한 점은 소개해준 분께 문의해 주세요.',
  },
  removed: {
    title: '이용이 중지된 계정이에요',
    description: '궁금한 점은 운영자에게 문의해 주세요.',
  },
} as const

export function PendingPage() {
  const profile = useAuth((s) => s.profile)!
  const status = profile.status === 'approved' ? 'pending' : profile.status
  const { title, description } = MESSAGES[status]
  const Icon = status === 'pending' ? Clock : UserX

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-sm font-semibold text-primary">{APP_NAME}</p>
      <div className="space-y-3">
        <Icon className="mx-auto size-10 text-muted-foreground" />
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {status === 'pending' && (
        <Card className="w-full max-w-xs py-4">
          <CardContent className="space-y-1 px-4 text-sm">
            <Row label="닉네임" value={profile.nickname} />
            <Row label="소개해준 분" value={profile.referrerName || '-'} />
          </CardContent>
        </Card>
      )}

      <Button variant="outline" onClick={signOutUser}>
        로그아웃
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
