import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME } from '@/lib/constants'
import { toErrorMessage } from '@/lib/format'
import { isOwnerAccount, signOutUser } from '@/services/auth'
import { createProfile } from '@/services/users'
import { useAuth } from '@/stores/auth'

const nicknameSchema = z.string().trim().min(1, '닉네임을 입력해 주세요').max(20, '20자 이하로 입력해 주세요')

export function SignupPage() {
  const user = useAuth((s) => s.user)!
  const owner = isOwnerAccount(user)

  const schema = z.object({
    nickname: nicknameSchema,
    referrerName: owner
      ? z.string().trim().max(30, '30자 이하로 입력해 주세요')
      : z.string().trim().min(1, '소개해준 분의 이름을 입력해 주세요').max(30, '30자 이하로 입력해 주세요'),
  })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nickname: user.displayName ?? '', referrerName: '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await createProfile(user, values)
      // 이후 이동은 AuthGate가 users 문서 변화를 보고 처리
    } catch (error) {
      console.error(error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{APP_NAME} 가입 신청</CardTitle>
          <CardDescription>
            {owner ? '오너 계정이에요. 바로 입장할 수 있어요.' : '운영자가 확인 후 승인하면 이용할 수 있어요.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
            <UserAvatar name={user.displayName ?? '?'} photoURL={user.photoURL} />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{user.displayName}</p>
              <p className="truncate text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input id="nickname" autoComplete="nickname" aria-invalid={!!errors.nickname} {...register('nickname')} />
              <FieldError message={errors.nickname?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referrerName">소개해준 분 {owner && <span className="text-muted-foreground">(선택)</span>}</Label>
              <Input
                id="referrerName"
                placeholder="예: 김철수"
                aria-invalid={!!errors.referrerName}
                {...register('referrerName')}
              />
              <p className="text-xs text-muted-foreground">회원 목록에 "OO의 지인"으로 표시돼요</p>
              <FieldError message={errors.referrerName?.message} />
            </div>

            <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
              {owner ? '시작하기' : '가입 신청하기'}
            </Button>
          </form>

          <button type="button" onClick={signOutUser} className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
            다른 계정으로 로그인
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}
