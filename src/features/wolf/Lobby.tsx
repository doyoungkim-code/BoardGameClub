import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Crown, Users, X } from '@/components/icons'
import { SectionTitle } from '@/components/SectionTitle'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/UserAvatar'
import { checkRoles, recommendedRoles, sortRoles } from '@/games/wolf/engine'
import { ROLE_ORDER, ROLES, type RoleId } from '@/games/wolf/roles'
import { wolfName } from '@/features/wolf/describe'
import { RoleArt } from '@/features/wolf/RoleCard'
import { toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  claimHost,
  joinRoom,
  kickFromRoom,
  leaveRoom,
  setReady,
  startGame,
  updateRoomSettings,
} from '@/services/wolf'
import { useMembers } from '@/stores/members'
import type { WolfRoom } from '@/types/wolf'

const STEP_CHOICES = [8, 10, 15, 20]
const DISCUSS_CHOICES = [180, 300, 420, 600]

/** 오류를 회원에게 보여줄 말로 */
function joinError(error: unknown) {
  if (error instanceof Error && error.message === 'playing') return '지금 판이 진행 중이에요. 끝나면 들어올 수 있어요'
  if (error instanceof Error && error.message === 'full') return '10명까지 들어올 수 있어요'
  return toErrorMessage(error)
}

/** 대기실: 들어오기·준비·(방장) 구성과 시간 정하기·시작 */
export function Lobby({ room, uid }: { room: WolfRoom | null; uid: string }) {
  const byId = useMembers((s) => s.byId)
  const [busy, setBusy] = useState(false)
  const seats = room?.seats ?? []
  const seated = seats.includes(uid)
  const isHost = room?.hostId === uid
  const ready = room?.readyIds.includes(uid) ?? false

  const run = async (fn: () => Promise<unknown>, onError: (error: unknown) => string = toErrorMessage) => {
    setBusy(true)
    try {
      await fn()
    } catch (error) {
      console.error(error)
      toast.error(onError(error))
    } finally {
      setBusy(false)
    }
  }

  const roles = room?.roles ?? []
  const roleProblem = checkRoles(roles, seats.length)
  const notReady = seats.filter((s) => s !== room?.hostId && !room?.readyIds.includes(s))
  const canStart = isHost && !roleProblem && notReady.length === 0

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle count={`${seats.length}/10`}>모인 사람</SectionTitle>
        {seats.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 아무도 없어요. 먼저 들어가면 방장이 돼요.</p>
        ) : (
          <ul className="space-y-2">
            {seats.map((s) => {
              const m = byId[s]
              return (
                <li key={s} className="flex items-center gap-3 border-2 border-border bg-card p-2">
                  <UserAvatar name={m?.nickname ?? '?'} photoURL={m?.photoURL ?? null} className="size-8" />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {wolfName(m)}
                    {s === uid && <span className="ml-1 text-xs font-normal text-muted-foreground">(나)</span>}
                  </span>
                  {s === room?.hostId ? (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Crown className="size-4" />
                      방장
                    </span>
                  ) : room?.readyIds.includes(s) ? (
                    <span className="flex items-center gap-1 text-xs text-green-700">
                      <Check className="size-4" />
                      준비
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">대기</span>
                  )}
                  {isHost && s !== uid && (
                    <Button size="icon-xs" variant="ghost" aria-label="내보내기" disabled={busy} onClick={() => run(() => kickFromRoom(s))}>
                      <X />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {!seated ? (
        <Button className="w-full" size="lg" disabled={busy || seats.length >= 10} onClick={() => run(() => joinRoom(uid), joinError)}>
          <Users />
          들어가기
        </Button>
      ) : isHost ? (
        <div className="space-y-2">
          <Button className="w-full" size="lg" disabled={busy || !canStart} onClick={() => run(() => startGame(room!, uid))}>
            시작하기
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {roleProblem ??
              (notReady.length > 0 ? `${notReady.map((s) => wolfName(byId[s])).join(', ')} 님이 아직 준비 전이에요` : '모두 준비됐어요!')}
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" variant={ready ? 'outline' : 'default'} disabled={busy} onClick={() => run(() => setReady(uid, !ready))}>
            {ready ? '준비 취소' : '준비'}
          </Button>
        </div>
      )}

      <RoleSetup room={room} editable={isHost} busy={busy} run={run} />

      {seated && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => leaveRoom(uid))}>
            나가기
          </Button>
          {!isHost && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => claimHost(uid))}>
              방장이 자리에 없으면: 방장 넘겨받기
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/** 카드 구성과 시간. 방장만 바꾸고 모두 본다 */
function RoleSetup({
  room,
  editable,
  busy,
  run,
}: {
  room: WolfRoom | null
  editable: boolean
  busy: boolean
  run: (fn: () => Promise<unknown>) => Promise<void>
}) {
  if (!room) return null
  const roles = room.roles
  const players = room.seats.length
  const count = (r: RoleId) => roles.filter((x) => x === r).length
  const setRoles = (next: RoleId[]) => run(() => updateRoomSettings({ roles: sortRoles(next) }))

  const change = (r: RoleId, delta: number) => {
    // 프리메이슨은 2장씩
    const step = r === 'mason' ? 2 : 1
    if (delta > 0) setRoles([...roles, ...Array<RoleId>(step).fill(r)])
    else {
      let left = step
      setRoles(roles.filter((x) => (x === r && left > 0 ? (left--, false) : true)))
    }
  }

  return (
    <section className="space-y-3">
      <SectionTitle count={`${roles.length}/${players + 3}장`}>카드 구성</SectionTitle>
      {editable && (
        <Button size="sm" variant="secondary" disabled={busy || players < 3} onClick={() => setRoles(recommendedRoles(players))}>
          {players}명 추천 구성으로
        </Button>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ROLE_ORDER.map((r) => {
          const c = count(r)
          if (!editable && c === 0) return null
          const max = ROLES[r].max
          return (
            <li key={r} className={cn('flex items-center gap-2 border-2 border-border bg-card p-1.5', c === 0 && 'opacity-50')}>
              <RoleArt role={r} size={32} />
              <span className="min-w-0 flex-1 truncate text-xs">{ROLES[r].name}</span>
              {editable ? (
                <span className="flex items-center gap-1">
                  <Button size="icon-xs" variant="outline" aria-label={`${ROLES[r].name} 빼기`} disabled={busy || c === 0} onClick={() => change(r, -1)}>
                    -
                  </Button>
                  <span className="w-4 text-center text-xs">{c}</span>
                  <Button size="icon-xs" variant="outline" aria-label={`${ROLES[r].name} 더하기`} disabled={busy || c >= max} onClick={() => change(r, 1)}>
                    +
                  </Button>
                </span>
              ) : (
                <span className="text-xs">×{c}</span>
              )}
            </li>
          )
        })}
      </ul>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Choice
          label="밤 한 단계"
          value={room.stepSec}
          options={STEP_CHOICES}
          format={(v) => `${v}초`}
          editable={editable}
          disabled={busy}
          onChange={(v) => run(() => updateRoomSettings({ stepSec: v }))}
        />
        <Choice
          label="토론 시간"
          value={room.discussSec}
          options={DISCUSS_CHOICES}
          format={(v) => `${v / 60}분`}
          editable={editable}
          disabled={busy}
          onChange={(v) => run(() => updateRoomSettings({ discussSec: v }))}
        />
      </div>
    </section>
  )
}

function Choice({
  label,
  value,
  options,
  format,
  editable,
  disabled,
  onChange,
}: {
  label: string
  value: number
  options: number[]
  format: (v: number) => string
  editable: boolean
  disabled: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {editable ? (
        <div className="flex flex-wrap gap-1">
          {options.map((o) => (
            <Button key={o} size="xs" variant={o === value ? 'default' : 'outline'} disabled={disabled} onClick={() => onChange(o)}>
              {format(o)}
            </Button>
          ))}
        </div>
      ) : (
        <p className="font-bold">{format(value)}</p>
      )}
    </div>
  )
}
