import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, format } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/auth/SignupPage'
import { usePlaces } from '@/hooks/usePlaces'
import { toErrorMessage } from '@/lib/format'
import { createPoll, MAX_OPTIONS, MIN_OPTIONS, sortOptions } from '@/services/polls'
import { useAuth } from '@/stores/auth'
import type { PollOption } from '@/types/poll'

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요').max(50, '50자 이하로 입력해 주세요'),
  location: z.string().trim().max(100, '100자 이하로 입력해 주세요'),
  description: z.string().trim().max(1000, '1000자 이하로 입력해 주세요'),
})
type FormValues = z.infer<typeof schema>

const newOptionId = () => Math.random().toString(36).slice(2, 10)

/** 처음엔 내일·모레 두 칸 */
const initialOptions = (): PollOption[] =>
  [1, 2].map((days) => ({ id: newOptionId(), date: format(addDays(new Date(), days), 'yyyy-MM-dd'), time: '' }))

/** /polls/new — 날짜를 정하지 않고 후보 날짜만 올린다 */
export function PollFormPage() {
  const uid = useAuth((s) => s.profile!.uid)
  const navigate = useNavigate()
  const places = usePlaces()
  const [options, setOptions] = useState<PollOption[]>(initialOptions)
  const [optionError, setOptionError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', location: '', description: '' },
  })

  const patchOption = (id: string, patch: Partial<PollOption>) =>
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))

  const addOption = () => {
    // 마지막 후보 다음 날로 채워 둔다
    const last = options.at(-1)
    const next = last?.date ? addDays(new Date(`${last.date}T00:00:00`), 1) : addDays(new Date(), 1)
    setOptions([...options, { id: newOptionId(), date: format(next, 'yyyy-MM-dd'), time: last?.time ?? '' }])
  }

  const checkOptions = () => {
    if (options.some((o) => !o.date)) return '날짜를 모두 골라 주세요'
    const keys = options.map((o) => `${o.date} ${o.time}`)
    if (new Set(keys).size !== keys.length) return '같은 날짜·시간이 두 번 있어요'
    if (options.length < MIN_OPTIONS) return `후보를 ${MIN_OPTIONS}개 이상 넣어 주세요`
    return null
  }

  const onSubmit = async (values: FormValues) => {
    const problem = checkOptions()
    setOptionError(problem)
    if (problem) return
    try {
      const id = await createPoll(uid, { ...values, options: sortOptions(options) })
      toast.success('일정 투표를 올렸어요')
      navigate(`/polls/${id}`, { replace: true })
    } catch (error) {
      console.error('일정 투표 만들기 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <BackButton fallback="/events" />
        <h1 className="text-2xl font-bold">일정 투표 만들기</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        날짜를 정하기 전에 후보를 올려 두면, 회원들이 되는 날짜를 모두 골라요. 가장 많이 되는 날로 모임을 만들면 돼요.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" placeholder="예: 10월 첫 모임 언제 할까요?" aria-invalid={!!errors.title} {...register('title')} />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="space-y-2">
          <Label>후보 날짜 ({options.length}/{MAX_OPTIONS})</Label>
          <ul className="space-y-2">
            {options.map((option, index) => (
              <li key={option.id} className="flex items-center gap-2">
                <Input
                  type="date"
                  value={option.date}
                  onChange={(e) => patchOption(option.id, { date: e.target.value })}
                  aria-label={`후보 ${index + 1} 날짜`}
                  className="min-w-0 flex-1"
                />
                <Input
                  type="time"
                  value={option.time}
                  onChange={(e) => patchOption(option.id, { time: e.target.value })}
                  aria-label={`후보 ${index + 1} 시간 (선택)`}
                  className="w-32 shrink-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={options.length <= MIN_OPTIONS}
                  onClick={() => setOptions(options.filter((o) => o.id !== option.id))}
                  aria-label={`후보 ${index + 1} 빼기`}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">시간은 비워 둬도 돼요 (날짜만 투표)</p>
          {options.length < MAX_OPTIONS && (
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="size-4" />
              후보 추가
            </Button>
          )}
          <FieldError message={optionError ?? undefined} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">장소 (선택)</Label>
          <Input id="location" placeholder="예: 강남 보드게임카페" aria-invalid={!!errors.location} {...register('location')} />
          {places && places.length > 0 && (
            <Select onValueChange={(name) => setValue('location', name, { shouldDirty: true })}>
              <SelectTrigger className="w-full" aria-label="즐겨찾기한 카페에서 고르기">
                <SelectValue placeholder="즐겨찾기한 카페에서 고르기" />
              </SelectTrigger>
              <SelectContent>
                {places.map((place) => (
                  <SelectItem key={place.id} value={place.name}>
                    {place.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FieldError message={errors.location?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 (선택)</Label>
          <Textarea id="description" rows={3} placeholder="하고 싶은 게임, 정원 등" {...register('description')} />
          <FieldError message={errors.description?.message} />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          투표 올리기
        </Button>
      </form>
    </div>
  )
}
