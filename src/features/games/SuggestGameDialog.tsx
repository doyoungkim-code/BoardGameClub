import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/auth/SignupPage'
import { toErrorMessage } from '@/lib/format'
import { addSuggestion } from '@/services/gameSuggestions'
import { useAuth } from '@/stores/auth'

const schema = z.object({
  name: z.string().trim().min(1, '게임 이름을 입력해 주세요').max(50, '50자 이하로 입력해 주세요'),
  players: z.string().trim().max(20, '20자 이하로 입력해 주세요'),
  note: z.string().trim().max(300, '300자 이하로 입력해 주세요'),
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 다 쓰면 (추천 목록 탭으로 옮길 때) */
  onAdded?: () => void
}

/** 들여 놓고 싶은 게임을 메모로 남긴다. 오너가 보고 게임 목록에 직접 넣는다 */
export function SuggestGameDialog({ open, onOpenChange, onAdded }: Props) {
  const uid = useAuth((s) => s.profile!.uid)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', players: '', note: '' } })

  const onSubmit = async (values: FormValues) => {
    try {
      await addSuggestion(uid, values)
      toast.success(`'${values.name}' 을(를) 추천했어요`)
      reset()
      onOpenChange(false)
      onAdded?.()
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>게임 추천하기</DialogTitle>
          <DialogDescription>동호회에 들여 놓으면 좋을 게임을 적어 주세요. 오너가 보고 목록에 넣어요.</DialogDescription>
        </DialogHeader>
        <form id="suggest-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="suggest-name">게임 이름</Label>
            <Input id="suggest-name" placeholder="예: 윙스팬" aria-invalid={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggest-players">몇 명이서 (선택)</Label>
            <Input id="suggest-players" placeholder="예: 1~5명" aria-invalid={!!errors.players} {...register('players')} />
            <FieldError message={errors.players?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggest-note">메모 (선택)</Label>
            <Textarea
              id="suggest-note"
              rows={3}
              placeholder="왜 좋은지, 어디서 해 봤는지, 링크 등"
              aria-invalid={!!errors.note}
              {...register('note')}
            />
            <FieldError message={errors.note?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="suggest-form" disabled={isSubmitting}>
            추천하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
