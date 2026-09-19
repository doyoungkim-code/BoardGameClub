import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { addDays } from 'date-fns'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { BackButton } from '@/components/BackButton'
import { PageSpinner } from '@/components/PageSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/auth/SignupPage'
import { usePlaces } from '@/hooks/usePlaces'
import { toDateTimeLocal, toErrorMessage } from '@/lib/format'
import { canManage, createEvent, fetchEvent, updateEvent } from '@/services/events'
import { createEventFromPoll, fetchPoll, optionDate } from '@/services/polls'
import { useAuth, useIsOwner } from '@/stores/auth'
import type { ClubEvent } from '@/types/event'

const schema = z
  .object({
    title: z.string().trim().min(1, '모임 이름을 입력해 주세요').max(50, '50자 이하로 입력해 주세요'),
    startAt: z.string().min(1, '시작 시각을 정해 주세요'),
    endAt: z.string(),
    location: z.string().trim().max(100, '100자 이하로 입력해 주세요'),
    capacity: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d+$/.test(v), '숫자만 입력해 주세요')
      .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 100), '1~100 사이로 입력해 주세요'),
    description: z.string().trim().max(1000, '1000자 이하로 입력해 주세요'),
  })
  .refine((v) => !v.endAt || new Date(v.endAt) > new Date(v.startAt), {
    path: ['endAt'],
    message: '종료 시각은 시작보다 뒤여야 해요',
  })

type FormValues = z.infer<typeof schema>

const emptyValues = (): FormValues => ({
  title: '',
  // 기본값은 내일 저녁 7시
  startAt: toDateTimeLocal(new Date(addDays(new Date(), 1).setHours(19, 0, 0, 0))),
  endAt: '',
  location: '',
  capacity: '',
  description: '',
})

const toFormValues = (event: ClubEvent): FormValues => ({
  title: event.title,
  startAt: toDateTimeLocal(event.startAt.toDate()),
  endAt: event.endAt ? toDateTimeLocal(event.endAt.toDate()) : '',
  location: event.location,
  capacity: event.capacity === null ? '' : String(event.capacity),
  description: event.description,
})

/** 일정 투표에서 고른 날짜로 모임을 만들 때 (/events/new?poll=<id>&option=<후보 id>) */
type FromPoll = { pollId: string; values: FormValues }

/** /events/new 와 /events/:eventId/edit 을 함께 처리한다 */
export function EventFormPage() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const pollId = eventId ? null : searchParams.get('poll')
  const optionId = searchParams.get('option')
  const [event, setEvent] = useState<ClubEvent | null | undefined>(eventId ? undefined : null)
  const [fromPoll, setFromPoll] = useState<FromPoll | null | undefined>(pollId ? undefined : null)

  useEffect(() => {
    if (!eventId) return
    fetchEvent(eventId)
      .then(setEvent)
      .catch((error) => {
        console.error('모임 불러오기 실패', error)
        setEvent(null)
      })
  }, [eventId])

  // 투표 내용(제목·장소·설명)과 고른 날짜로 폼을 채운다
  useEffect(() => {
    if (!pollId) return
    fetchPoll(pollId)
      .then((poll) => {
        const option = poll?.options.find((o) => o.id === optionId)
        if (!poll || !option) {
          setFromPoll(null)
          return
        }
        setFromPoll({
          pollId,
          values: {
            ...emptyValues(),
            title: poll.title,
            location: poll.location,
            description: poll.description,
            startAt: toDateTimeLocal(optionDate(option)),
          },
        })
      })
      .catch((error) => {
        console.error('일정 투표 불러오기 실패', error)
        setFromPoll(null)
      })
  }, [pollId, optionId])

  if (event === undefined || fromPoll === undefined) return <PageSpinner />
  if (eventId && !event) return <EventFormMissing />
  return <EventForm event={event ?? undefined} fromPoll={fromPoll ?? undefined} />
}

function EventFormMissing() {
  return (
    <div className="space-y-4 text-center">
      <p className="py-16 text-sm text-muted-foreground">모임을 찾을 수 없어요</p>
      <Button asChild variant="outline">
        <Link to="/events">모임 목록으로</Link>
      </Button>
    </div>
  )
}

function EventForm({ event, fromPoll }: { event?: ClubEvent; fromPoll?: FromPoll }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const navigate = useNavigate()
  const editing = !!event

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: event ? toFormValues(event) : (fromPoll?.values ?? emptyValues()),
  })
  const places = usePlaces()

  if (editing && !canManage(event, profile.uid, isOwner)) return <EventFormForbidden />

  const onSubmit = async (values: FormValues) => {
    const input = {
      title: values.title,
      description: values.description,
      location: values.location,
      startAt: new Date(values.startAt),
      endAt: values.endAt ? new Date(values.endAt) : null,
      capacity: values.capacity === '' ? null : Number(values.capacity),
    }
    try {
      if (event) {
        await updateEvent(event.id, input)
        toast.success('모임을 수정했어요')
        navigate(`/events/${event.id}`, { replace: true })
      } else if (fromPoll) {
        // 모임을 만들면서 같은 batch 로 투표를 마감한다
        const id = await createEventFromPoll(profile.uid, input, fromPoll.pollId)
        toast.success('투표로 정한 날짜에 모임을 만들었어요')
        navigate(`/events/${id}`, { replace: true })
      } else {
        const id = await createEvent(profile.uid, input)
        toast.success('모임을 만들었어요')
        navigate(`/events/${id}`, { replace: true })
      }
    } catch (error) {
      console.error('모임 저장 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <BackButton fallback={event ? `/events/${event.id}` : fromPoll ? `/polls/${fromPoll.pollId}` : '/events'} />
        <h1 className="text-2xl font-bold">{editing ? '모임 수정' : fromPoll ? '투표로 모임 만들기' : '새 모임'}</h1>
      </div>
      {fromPoll && (
        <p className="text-sm text-muted-foreground">
          투표 내용과 고른 날짜를 채워 뒀어요. 시간·정원을 확인하고 만들면 투표는 자동으로 마감돼요.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="title">이름</Label>
          <Input id="title" placeholder="예: 토요일 보드게임 모임" aria-invalid={!!errors.title} {...register('title')} />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startAt">시작</Label>
            <Input id="startAt" type="datetime-local" aria-invalid={!!errors.startAt} {...register('startAt')} />
            <FieldError message={errors.startAt?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endAt">종료 (선택)</Label>
            <Input id="endAt" type="datetime-local" aria-invalid={!!errors.endAt} {...register('endAt')} />
            <FieldError message={errors.endAt?.message} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">장소 (선택)</Label>
          <Input id="location" placeholder="예: 강남 보드게임카페" aria-invalid={!!errors.location} {...register('location')} />
          {/* 오너가 즐겨찾기한 카페를 고르면 이름을 채워준다. 이름이 같으면 모임 화면에서 지도로 연결된다 */}
          {places && places.length > 0 && (
            <Select onValueChange={(name) => setValue('location', name, { shouldDirty: true, shouldValidate: true })}>
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
          <Label htmlFor="capacity">정원 (선택)</Label>
          <Input
            id="capacity"
            inputMode="numeric"
            placeholder="비워두면 제한 없음"
            aria-invalid={!!errors.capacity}
            {...register('capacity')}
          />
          <FieldError message={errors.capacity?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 (선택)</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="어떤 게임을 할지, 준비물이 있는지 적어주세요"
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {editing ? '저장' : '모임 만들기'}
        </Button>
      </form>
    </div>
  )
}

function EventFormForbidden() {
  return (
    <div className="space-y-4 text-center">
      <p className="py-16 text-sm text-muted-foreground">이 모임을 수정할 권한이 없어요</p>
      <Button asChild variant="outline">
        <Link to="/events">모임 목록으로</Link>
      </Button>
    </div>
  )
}
