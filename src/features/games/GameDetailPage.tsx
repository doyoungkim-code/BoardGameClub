import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { ChevronLeft, Clock, EllipsisVertical, ExternalLink, Gauge, Package, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageSpinner } from '@/components/PageSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelative, toErrorMessage } from '@/lib/format'
import {
  canEditGame,
  canReturnGame,
  deleteGame,
  gameRef,
  playerRangeText,
  setBorrowed,
  toGame,
} from '@/services/games'
import { useAuth, useIsOwner } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import { WEIGHT_LABEL, type Game } from '@/types/game'

export function GameDetailPage() {
  const { gameId } = useParams()
  const [game, setGame] = useState<Game | null | undefined>(undefined)

  useEffect(() => {
    if (!gameId) return
    // 대여 현황이 실시간으로 바뀌므로 상세는 구독한다
    return onSnapshot(
      gameRef(gameId),
      (snap) => setGame(snap.exists() ? toGame(snap) : null),
      (error) => {
        console.error('게임 구독 실패', error)
        setGame(null)
      },
    )
  }, [gameId])

  if (game === undefined) return <PageSpinner />
  if (!game) {
    return (
      <div className="space-y-4 text-center">
        <p className="py-16 text-sm text-muted-foreground">게임을 찾을 수 없어요</p>
        <Button asChild variant="outline">
          <Link to="/games">게임 목록으로</Link>
        </Button>
      </div>
    )
  }
  return <GameDetail game={game} />
}

function GameDetail({ game }: { game: Game }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const membersById = useMembers((s) => s.byId)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editable = canEditGame(game, profile.uid, isOwner)
  const holder = game.borrowerId ? membersById[game.borrowerId] : null
  const owner = game.ownerId ? membersById[game.ownerId] : null

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } catch (error) {
      console.error('게임 처리 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/games" aria-label="게임 목록으로">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {game.borrowerId ? <Badge variant="secondary">대여 중</Badge> : <Badge variant="outline">보관 중</Badge>}
        </div>
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="게임 관리">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/games/${game.id}/edit`}>수정</Link>
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{game.name}</h1>
        {game.altName && <p className="text-sm text-muted-foreground">{game.altName}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact icon={Users} label="인원" value={playerRangeText(game)} />
        <Fact icon={Clock} label="시간" value={game.playTimeMin === null ? '-' : `${game.playTimeMin}분`} />
        <Fact icon={Gauge} label="난이도" value={game.weight === null ? '-' : WEIGHT_LABEL[game.weight]} />
        <Fact icon={Package} label="소장" value={game.ownership === 'club' ? '동호회 공용' : (owner?.nickname ?? '회원')} />
      </dl>

      {game.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {game.description && <p className="text-sm leading-relaxed whitespace-pre-wrap">{game.description}</p>}

      {game.bggUrl && (
        <a
          href={game.bggUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          BoardGameGeek에서 보기
          <ExternalLink className="size-3.5" />
        </a>
      )}

      <section className="space-y-3 border-t pt-5">
        <h2 className="font-semibold">대여</h2>
        {game.borrowerId ? (
          <>
            <p className="text-sm">
              <span className="font-medium">{holder?.nickname ?? '알 수 없는 회원'}</span>님이 빌려갔어요
              {game.borrowedAt && <span className="text-muted-foreground"> · {formatRelative(game.borrowedAt)}</span>}
            </p>
            {canReturnGame(game, profile.uid, isOwner) && (
              <Button
                variant="outline"
                className="h-11 w-full"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setBorrowed(game.id, null)
                    toast.success('반납 처리했어요')
                  })
                }
              >
                {game.borrowerId === profile.uid ? '반납하기' : '반납 처리'}
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">지금 빌릴 수 있어요</p>
            <Button
              className="h-11 w-full"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await setBorrowed(game.id, profile.uid)
                  toast.success('빌려가는 것으로 표시했어요')
                })
              }
            >
              빌리기
            </Button>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="게임을 삭제할까요?"
        description="목록에서 완전히 사라져요."
        confirmLabel="삭제"
        destructive
        onConfirm={() =>
          run(async () => {
            await deleteGame(game.id)
            toast.success('게임을 삭제했어요')
            navigate('/games', { replace: true })
          })
        }
      />
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}
