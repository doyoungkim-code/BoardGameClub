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
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/auth/SignupPage'
import type { LatLng } from '@/features/places/PlaceMap'
import { toErrorMessage } from '@/lib/format'
import { createPlace, updatePlace } from '@/services/places'
import { useAuth } from '@/stores/auth'
import type { Place } from '@/types/place'

const schema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요').max(40, '40자 이하로 입력해 주세요'),
  address: z.string().trim().max(100, '100자 이하로 입력해 주세요'),
  memo: z.string().trim().max(300, '300자 이하로 입력해 주세요'),
})
type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 지도에서 찍은 위치 */
  point: LatLng | null
  /** 없으면 새 장소 */
  place?: Place
  /** 새 장소일 때 미리 채울 값 (카카오 검색 결과) */
  defaults?: { name: string; address: string }
  onSaved: (placeId: string) => void
}

export function PlaceFormDialog({ open, onOpenChange, point, place, defaults, onSaved }: Props) {
  const uid = useAuth((s) => s.profile!.uid)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: place?.name ?? defaults?.name ?? '',
      address: place?.address ?? defaults?.address ?? '',
      memo: place?.memo ?? '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    const at = point ?? (place ? { lat: place.lat, lng: place.lng } : null)
    if (!at) return
    try {
      if (place) {
        await updatePlace(place.id, { ...values, ...at })
        toast.success('장소를 고쳤어요')
        onSaved(place.id)
      } else {
        const id = await createPlace(uid, { ...values, ...at })
        toast.success(`${values.name}을(를) 지도에 추가했어요`)
        onSaved(id)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('장소 저장 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{place ? '장소 수정' : '새 장소'}</DialogTitle>
          <DialogDescription>
            {point && place ? '핀 위치도 방금 찍은 곳으로 바뀌어요.' : '회원 모두가 지도에서 볼 수 있어요.'}
          </DialogDescription>
        </DialogHeader>
        <form id="place-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="place-name">이름</Label>
            <Input id="place-name" placeholder="예: 레드버튼 강남점" aria-invalid={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="place-address">주소 (선택)</Label>
            <Input id="place-address" placeholder="예: 서울 강남구 강남대로 000" {...register('address')} />
            <FieldError message={errors.address?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="place-memo">메모 (선택)</Label>
            <Textarea id="place-memo" rows={3} placeholder="예: 2층, 1인 3시간 5천원, 주차 불가" {...register('memo')} />
            <FieldError message={errors.memo?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="place-form" disabled={isSubmitting}>
            {place ? '저장' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
