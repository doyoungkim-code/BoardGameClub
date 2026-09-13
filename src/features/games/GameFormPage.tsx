import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageSpinner } from '@/components/PageSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/auth/SignupPage'
import { toErrorMessage } from '@/lib/format'
import { canEditGame, createGame, fetchGame, updateGame } from '@/services/games'
import { useAuth, useIsOwner } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import { SUGGESTED_TAGS, WEIGHT_LABEL, type Game } from '@/types/game'

/** Select 는 빈 문자열을 값으로 쓸 수 없어서 "공용"에 따로 값을 준다 */
const CLUB = 'club'

const optionalInt = (max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+$/.test(v), '숫자만 입력해 주세요')
    .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= max), message)

const schema = z
  .object({
    name: z.string().trim().min(1, '게임 이름을 입력해 주세요').max(60, '60자 이하로 입력해 주세요'),
    altName: z.string().trim().max(60, '60자 이하로 입력해 주세요'),
    minPlayers: z
      .string()
      .trim()
      .min(1, '최소 인원을 입력해 주세요')
      .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 99, '1~99 사이로 입력해 주세요'),
    maxPlayers: z
      .string()
      .trim()
      .min(1, '최대 인원을 입력해 주세요')
      .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 99, '1~99 사이로 입력해 주세요'),
    playTimeMin: optionalInt(1440, '1~1440 사이로 입력해 주세요'),
    description: z.string().trim().max(1000, '1000자 이하로 입력해 주세요'),
    bggUrl: z
      .string()
      .trim()
      .max(200, '200자 이하로 입력해 주세요')
      .refine((v) => v === '' || v.startsWith('http'), '주소는 http로 시작해야 해요'),
  })
  .refine((v) => Number(v.maxPlayers) >= Number(v.minPlayers), {
    path: ['maxPlayers'],
    message: '최대 인원은 최소 인원보다 커야 해요',
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  name: '',
  altName: '',
  minPlayers: '2',
  maxPlayers: '4',
  playTimeMin: '',
  description: '',
  bggUrl: '',
}

const toFormValues = (game: Game): FormValues => ({
  name: game.name,
  altName: game.altName,
  minPlayers: String(game.minPlayers),
  maxPlayers: String(game.maxPlayers),
  playTimeMin: game.playTimeMin === null ? '' : String(game.playTimeMin),
  description: game.description,
  bggUrl: game.bggUrl,
})

/** /games/new 와 /games/:gameId/edit 을 함께 처리한다 */
export function GameFormPage() {
  const { gameId } = useParams()
  const [game, setGame] = useState<Game | null | undefined>(gameId ? undefined : null)

  useEffect(() => {
    if (!gameId) return
    fetchGame(gameId)
      .then(setGame)
      .catch((error) => {
        console.error('게임 불러오기 실패', error)
        setGame(null)
      })
  }, [gameId])

  if (game === undefined) return <PageSpinner />
  if (gameId && !game) return <GameFormNotice text="게임을 찾을 수 없어요" />
  return <GameForm game={game ?? undefined} />
}

function GameForm({ game }: { game?: Game }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const members = useMembers((s) => s.members)
  const navigate = useNavigate()
  const editing = !!game

  // 폼 밖에서 다루는 값들 (선택형이라 register 로 묶기보다 상태가 단순하다)
  const [ownerId, setOwnerId] = useState<string | null>(game?.ownerId ?? null)
  const [weight, setWeight] = useState<number | null>(game?.weight ?? null)
  const [tags, setTags] = useState<string[]>(game?.tags ?? [])
  const [tagDraft, setTagDraft] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: game ? toFormValues(game) : emptyValues,
  })

  if (editing && !canEditGame(game, profile.uid, isOwner)) return <GameFormNotice text="이 게임을 수정할 권한이 없어요" />

  const addTag = (tag: string) => {
    const clean = tag.trim()
    if (!clean || tags.includes(clean) || tags.length >= 10) return
    setTags([...tags, clean])
    setTagDraft('')
  }

  const onSubmit = async (values: FormValues) => {
    const input = {
      name: values.name,
      altName: values.altName,
      minPlayers: Number(values.minPlayers),
      maxPlayers: Number(values.maxPlayers),
      playTimeMin: values.playTimeMin === '' ? null : Number(values.playTimeMin),
      weight,
      tags,
      description: values.description,
      bggUrl: values.bggUrl,
      ownership: ownerId ? ('member' as const) : ('club' as const),
      ownerId,
    }
    try {
      if (game) {
        await updateGame(game.id, input)
        toast.success('게임 정보를 수정했어요')
        navigate(`/games/${game.id}`, { replace: true })
      } else {
        const id = await createGame(profile.uid, input)
        toast.success('게임을 등록했어요')
        navigate(`/games/${id}`, { replace: true })
      }
    } catch (error) {
      console.error('게임 저장 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to={game ? `/games/${game.id}` : '/games'} aria-label="뒤로">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{editing ? '게임 수정' : '게임 등록'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input id="name" placeholder="예: 스플렌더" aria-invalid={!!errors.name} {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="altName">다른 이름 (선택)</Label>
          <Input id="altName" placeholder="예: Splendor" aria-invalid={!!errors.altName} {...register('altName')} />
          <FieldError message={errors.altName?.message} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPlayers">최소 인원</Label>
            <Input id="minPlayers" inputMode="numeric" aria-invalid={!!errors.minPlayers} {...register('minPlayers')} />
            <FieldError message={errors.minPlayers?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">최대 인원</Label>
            <Input id="maxPlayers" inputMode="numeric" aria-invalid={!!errors.maxPlayers} {...register('maxPlayers')} />
            <FieldError message={errors.maxPlayers?.message} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="playTimeMin">플레이 시간 (분, 선택)</Label>
          <Input
            id="playTimeMin"
            inputMode="numeric"
            placeholder="예: 45"
            aria-invalid={!!errors.playTimeMin}
            {...register('playTimeMin')}
          />
          <FieldError message={errors.playTimeMin?.message} />
        </div>

        <div className="space-y-2">
          <Label>난이도 (선택)</Label>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((w) => (
              <button key={w} type="button" onClick={() => setWeight(weight === w ? null : w)} aria-pressed={weight === w}>
                <Badge variant={weight === w ? 'default' : 'outline'} className="cursor-pointer font-normal">
                  {WEIGHT_LABEL[w]}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tag">태그 (선택, 최대 10개)</Label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 font-normal">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} aria-label={`${tag} 빼기`}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="tag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                // 폼이 제출되지 않게 막고 태그만 추가
                e.preventDefault()
                addTag(tagDraft)
              }}
              placeholder="직접 입력 후 Enter"
            />
            <Button type="button" variant="outline" onClick={() => addTag(tagDraft)}>
              추가
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
              <button key={tag} type="button" onClick={() => addTag(tag)}>
                <Badge variant="outline" className="cursor-pointer font-normal text-muted-foreground">
                  + {tag}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ownerId">소장</Label>
          <Select value={ownerId ?? CLUB} onValueChange={(v) => setOwnerId(v === CLUB ? null : v)}>
            <SelectTrigger id="ownerId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLUB}>동호회 공용</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.uid} value={m.uid}>
                  {m.nickname}님 소장
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bggUrl">BGG 주소 (선택)</Label>
          <Input
            id="bggUrl"
            inputMode="url"
            placeholder="https://boardgamegeek.com/boardgame/..."
            aria-invalid={!!errors.bggUrl}
            {...register('bggUrl')}
          />
          <FieldError message={errors.bggUrl?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 (선택)</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="어떤 게임인지, 누구에게 추천하는지"
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {editing ? '저장' : '등록'}
        </Button>
      </form>
    </div>
  )
}

function GameFormNotice({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-center">
      <p className="py-16 text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline">
        <Link to="/games">게임 목록으로</Link>
      </Button>
    </div>
  )
}
