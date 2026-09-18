import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trophy } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { InstallAppCard } from '@/components/InstallAppCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/auth/SignupPage'
import { formatDateTime, referrerLabel, toErrorMessage } from '@/lib/format'
import { signOutUser } from '@/services/auth'
import { updateNickname } from '@/services/users'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'

const schema = z.object({
  nickname: z.string().trim().min(1, '닉네임을 입력해 주세요').max(20, '20자 이하로 입력해 주세요'),
})
type FormValues = z.infer<typeof schema>

export function MePage() {
  const user = useAuth((s) => s.user)!
  const profile = useAuth((s) => s.profile)!
  const byId = useMembers((s) => s.byId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { nickname: profile.nickname },
  })

  const onSubmit = async ({ nickname }: FormValues) => {
    try {
      await updateNickname(profile.uid, nickname)
      reset({ nickname })
      toast.success('닉네임을 바꿨어요')
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  const referrer = referrerLabel(profile, byId)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">내 정보</h1>

      <Card>
        <CardContent className="flex items-center gap-4">
          <UserAvatar name={profile.nickname} photoURL={profile.photoURL} className="size-14" />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-bold">{profile.nickname}</p>
              {profile.role === 'owner' && <Badge>오너</Badge>}
            </div>
            {referrer && <p className="text-sm text-muted-foreground">{referrer}</p>}
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="h-11 w-full">
        <Link to={`/members/${profile.uid}`}>
          <Trophy className="size-4" />
          내 업적·활동 기록 보기
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">닉네임 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2" noValidate>
            <Label htmlFor="nickname" className="sr-only">
              닉네임
            </Label>
            <div className="flex gap-2">
              <Input id="nickname" aria-invalid={!!errors.nickname} {...register('nickname')} />
              <Button type="submit" disabled={!isDirty || isSubmitting}>
                저장
              </Button>
            </div>
            <FieldError message={errors.nickname?.message} />
          </form>
        </CardContent>
      </Card>

      <InstallAppCard />

      <NotificationSetting />

      <p className="text-center text-xs text-muted-foreground">가입 승인일 {formatDateTime(profile.approvedAt)}</p>

      <Button variant="outline" className="w-full" onClick={signOutUser}>
        로그아웃
      </Button>
    </div>
  )
}

/** 앱이 열려 있을 때 다른 탭을 보고 있어도 새 메시지를 알려주는 브라우저 알림 */
function NotificationSetting() {
  const supported = 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied')

  if (!supported) return null

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">브라우저 알림</p>
          <p className="text-xs text-muted-foreground">앱을 열어둔 채 다른 탭을 보고 있을 때 새 메시지를 알려드려요</p>
        </div>
        {permission === 'granted' ? (
          <Badge variant="secondary">켜짐</Badge>
        ) : permission === 'denied' ? (
          <span className="shrink-0 text-right text-xs text-muted-foreground">
            브라우저 설정에서
            <br />
            허용해 주세요
          </span>
        ) : (
          <Button size="sm" onClick={async () => setPermission(await Notification.requestPermission())}>
            켜기
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
