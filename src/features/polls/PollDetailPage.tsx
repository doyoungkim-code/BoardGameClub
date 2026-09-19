import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { CalendarPlus, Check, ChevronRight, Crown, EllipsisVertical, MapPin } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MemberName } from '@/components/MemberName'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  canManagePoll,
  closePoll,
  deletePoll,
  optionLabel,
  pollRef,
  reopenPoll,
  setMyVote,
  sortOptions,
  toPoll,
  voterCount,
  votersByOption,
} from '@/services/polls'
import { useAuth, useIsOwner } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import type { Poll } from '@/types/poll'

export function PollDetailPage() {
  const { pollId } = useParams()
  const [poll, setPoll] = useState<Poll | null | undefined>(undefined)

  useEffect(() => {
    if (!pollId) return
    // 다른 회원이 투표하면 바로 반영되게 구독한다
    return onSnapshot(
      pollRef(pollId),
      (snap) => setPoll(snap.exists() ? toPoll(snap) : null),
      (error) => {
        console.error('투표 구독 실패', error)
        setPoll(null)
      },
    )
  }, [pollId])

  if (poll === undefined) return <PageSpinner />
  if (!poll) {
    return (
      <div className="space-y-4 text-center">
        <p className="py-16 text-sm text-muted-foreground">투표를 찾을 수 없어요</p>
        <Button asChild variant="outline">
          <Link to="/events">모임으로</Link>
        </Button>
      </div>
    )
  }
  return <PollDetail poll={poll} />
}

function PollDetail({ poll }: { poll: Poll }) {
  const uid = useAuth((s) => s.profile!.uid)
  const isOwner = useIsOwner()
  const membersById = useMembers((s) => s.byId)
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const open = poll.status === 'open'
  const manageable = canManagePoll(poll, uid, isOwner)
  const options = sortOptions(poll.options)
  const voters = votersByOption(poll)
  const mine = new Set((poll.votes?.[uid] ?? []).filter((id) => voters.has(id)))
  const topCount = Math.max(0, ...[...voters.values()].map((list) => list.length))

  const toggle = async (optionId: string) => {
    if (!open || saving) return
    const next = new Set(mine)
    if (next.has(optionId)) next.delete(optionId)
    else next.add(optionId)
    setSaving(true)
    try {
      await setMyVote(poll.id, uid, [...next])
    } catch (error) {
      console.error('투표 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn()
      toast.success(message)
    } catch (error) {
      console.error('투표 관리 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <BackButton fallback="/events" />
        <div className="flex flex-1 items-center gap-1.5">
          <Badge variant={open ? 'default' : 'secondary'}>{open ? '투표 중' : '마감'}</Badge>
        </div>
        {manageable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="투표 관리">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {open ? (
                <DropdownMenuItem onSelect={() => void run(() => closePoll(poll.id), '투표를 마감했어요')}>
                  모임 없이 마감
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => void run(() => reopenPoll(poll.id), '투표를 다시 열었어요')}>
                  다시 열기
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{poll.title}</h1>
        {poll.location && (
          <p className="flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            {poll.location}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <MemberName uid={poll.createdBy} showTitle={false} /> 님이 올림 · {voterCount(poll)}명 투표
        </p>
      </div>

      {poll.description && <p className="text-sm leading-relaxed whitespace-pre-wrap">{poll.description}</p>}

      {!open && poll.eventId && (
        <Link
          to={`/events/${poll.eventId}`}
          className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium"
        >
          <CalendarPlus className="size-4 text-primary" />
          <span className="flex-1">이 투표로 모임이 만들어졌어요</span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      <section className="space-y-2">
        <h2 className="flex items-baseline gap-2 font-semibold">
          후보 날짜
          {open && <span className="text-xs font-normal text-muted-foreground">되는 날짜를 모두 눌러 주세요</span>}
        </h2>
        <ul className="space-y-2">
          {options.map((option) => {
            const list = voters.get(option.id) ?? []
            const picked = mine.has(option.id)
            const best = topCount > 0 && list.length === topCount
            return (
              <li
                key={option.id}
                className={cn('rounded-xl border p-3 transition-colors', best && 'border-primary/50 bg-primary/5')}
              >
                <button
                  type="button"
                  disabled={!open || saving}
                  onClick={() => void toggle(option.id)}
                  aria-pressed={picked}
                  className="flex w-full items-center gap-3 text-left disabled:cursor-default"
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border-2',
                      picked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                    )}
                  >
                    {picked && <Check className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      {optionLabel(option)}
                      {best && <Crown className="size-4 text-primary" aria-label="가장 많이 됨" />}
                    </span>
                    {!option.time && <span className="text-xs text-muted-foreground">시간 미정</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{list.length}명</span>
                </button>

                {list.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 pl-9">
                    {list.map((voter) => (
                      <UserAvatar
                        key={voter}
                        name={membersById[voter]?.nickname ?? '?'}
                        photoURL={membersById[voter]?.photoURL ?? null}
                        className="size-6"
                      />
                    ))}
                    <span className="sr-only">{list.map((v) => membersById[v]?.nickname ?? '알 수 없음').join(', ')}</span>
                  </div>
                )}

                {open && manageable && (
                  <Button
                    size="sm"
                    variant={best ? 'default' : 'outline'}
                    className="mt-3 ml-9"
                    onClick={() => navigate(`/events/new?poll=${poll.id}&option=${option.id}`)}
                  >
                    <CalendarPlus className="size-4" />이 날짜로 모임 만들기
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {topCount > 0 && (
        <p className="text-xs text-muted-foreground">
          <Crown className="inline size-3.5 align-text-bottom text-primary" /> 표시는 가장 많은 사람이 되는 날짜예요.
          사진은 그 날짜가 되는 사람이에요.
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="투표를 삭제할까요?"
        description="투표 결과도 함께 사라져요. 이미 만든 모임은 그대로 남아요."
        confirmLabel="삭제"
        destructive
        onConfirm={async () => {
          try {
            await deletePoll(poll.id)
            toast.success('투표를 삭제했어요')
            navigate('/events', { replace: true })
          } catch (error) {
            console.error('투표 삭제 실패', error)
            toast.error(toErrorMessage(error))
          }
        }}
      />
    </div>
  )
}
