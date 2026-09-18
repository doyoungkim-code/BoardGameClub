import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/auth/SignupPage'
import { toErrorMessage } from '@/lib/format'
import { createChannel, updateChannel } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import type { Channel } from '@/types/chat'

const schema = z.object({
  name: z.string().trim().min(1, '채널 이름을 입력해 주세요').max(30, '30자 이하로 입력해 주세요'),
  description: z.string().trim().max(100, '100자 이하로 입력해 주세요'),
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 없으면 새 채널 만들기 */
  channel?: Channel
  nextOrder?: number
}

export function ChannelFormDialog({ open, onOpenChange, channel, nextOrder = 0 }: Props) {
  const uid = useAuth((s) => s.profile!.uid)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: channel?.name ?? '', description: channel?.description ?? '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      if (channel) {
        await updateChannel(channel.id, values)
        toast.success('채널을 수정했어요')
      } else {
        await createChannel(uid, values, nextOrder)
        toast.success(`# ${values.name} 채널을 만들었어요`)
        reset()
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{channel ? '채널 수정' : '새 채널'}</DialogTitle>
          <DialogDescription>승인된 회원 모두가 참여하는 단체 대화방이에요.</DialogDescription>
        </DialogHeader>
        <form id="channel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="channel-name">이름</Label>
            <Input id="channel-name" placeholder="예: 모임" aria-invalid={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-description">설명 (선택)</Label>
            <Input id="channel-description" aria-invalid={!!errors.description} {...register('description')} />
            <FieldError message={errors.description?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="channel-form" disabled={isSubmitting}>
            {channel ? '저장' : '만들기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
