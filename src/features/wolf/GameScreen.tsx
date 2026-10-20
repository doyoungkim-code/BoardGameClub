import { useState } from 'react'
import { toast } from 'sonner'
import { Clock, Trophy } from '@/components/icons'
import { SectionTitle } from '@/components/SectionTitle'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { ActionKind, Info, StepId } from '@/games/wolf/engine'
import { ROLES, type RoleId } from '@/games/wolf/roles'
import { nightSegments, segmentAt, STEP_LABEL, stepOfAction } from '@/games/wolf/timeline'
import { eventText, infoText, roleName, stepCall, wolfName } from '@/features/wolf/describe'
import { Picker, type PickMode } from '@/features/wolf/Picker'
import { RoleArt, RoleCard } from '@/features/wolf/RoleCard'
import { useServerNow } from '@/features/wolf/useWolf'
import { toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { backToLobby, markDiscussionDone, resetRoom, sendAction, sendVote, setGamePhase } from '@/services/wolf'
import { useMembers } from '@/stores/members'
import type { WolfGame, WolfPrivate } from '@/types/wolf'

type Props = { game: WolfGame; priv: WolfPrivate | null; uid: string }

/** 판 진행 화면 (카드 확인 → 밤 → 낮 → 투표 → 결과). 밤에는 어두운 화면 */
export function GameScreen({ game, priv, uid }: Props) {
  const byId = useMembers((s) => s.byId)
  const names = game.players.map((p) => wolfName(byId[p]))
  const now = useServerNow()
  const dark = game.phase === 'deal' || game.phase === 'night'

  return (
    <div className={cn('space-y-6', dark && '-mx-4 min-h-[70vh] bg-[#141a33] px-4 py-6 text-slate-100 sm:-mx-6 sm:px-6')}>
      {/* 판 시작 시각은 서버 시각이라, 방장 폰에서는 서버 응답 전 잠깐 비어 있다 */}
      {!priv || game.phase === 'deal' || (game.phase === 'night' && !game.startedAt) ? (
        <Waiting text="카드를 나누고 있어요…" />
      ) : game.phase === 'night' ? (
        <Night game={game} priv={priv} uid={uid} names={names} now={now} />
      ) : game.phase === 'day' && game.dayEndAt ? (
        <Day game={game} priv={priv} uid={uid} names={names} now={now} />
      ) : game.phase === 'vote' && game.voteEndAt ? (
        <VoteView game={game} priv={priv} uid={uid} names={names} now={now} />
      ) : game.phase === 'result' && game.result ? (
        <Result game={game} uid={uid} names={names} />
      ) : (
        <Waiting text="판이 중간에 끝났어요" />
      )}
      <StuckHelp game={game} uid={uid} />
    </div>
  )
}

function Waiting({ text }: { text: string }) {
  return <p className="py-16 text-center text-sm opacity-80">{text}</p>
}

function Countdown({ end, now, className }: { end: number; now: number; className?: string }) {
  const left = Math.max(0, Math.ceil((end - now) / 1000))
  const m = Math.floor(left / 60)
  const s = left % 60
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
      <Clock className="size-4" />
      {m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}초`}
    </span>
  )
}

// ---------- 밤 ----------

/** 도플갱어가 복사한 역할 (복사 정보가 오면) */
const copiedOf = (priv: WolfPrivate) => priv.info.find((i): i is Extract<Info, { kind: 'copy' }> => i.kind === 'copy')?.role ?? null

/** 밤에 이 사람이 맡은 역할 */
function myNightRole(priv: WolfPrivate): RoleId {
  return priv.dealt === 'doppelganger' ? (copiedOf(priv) ?? 'doppelganger') : priv.dealt
}

/** 이 단계에서 내가 할 행동과 고르기 모양 (없으면 null = 가짜 선택) */
function myAction(step: StepId, priv: WolfPrivate, sent: Set<ActionKind>): { kind: ActionKind; mode: PickMode; prompt: string } | null {
  const role = myNightRole(priv)
  const byRole = (r: RoleId, kind: ActionKind) => {
    switch (r) {
      case 'seer':
        return { kind, mode: 'seer' as const, prompt: '다른 사람 1명의 카드, 또는 가운데 카드 2장을 볼 수 있어요' }
      case 'robber':
        return { kind, mode: 'player1' as const, prompt: '카드를 바꿀 사람을 고르세요. 바꾼 뒤 내 새 카드를 봐요' }
      case 'troublemaker':
        return { kind, mode: 'player2' as const, prompt: '카드를 서로 바꿔 줄 두 사람을 고르세요 (보지는 못해요)' }
      case 'drunk':
        return { kind, mode: 'center1' as const, prompt: '내 카드와 바꿀 가운데 카드를 고르세요 (새 카드는 못 봐요)' }
      default:
        return null
    }
  }
  if (step === 'doppelganger' && priv.dealt === 'doppelganger') {
    if (!sent.has('copy')) return { kind: 'copy', mode: 'player1', prompt: '카드를 볼 사람을 고르세요. 그 역할이 돼요' }
    const copied = copiedOf(priv)
    return copied && !sent.has('doppelAct') ? byRole(copied, 'doppelAct') : null
  }
  if (step === 'werewolf' && role === 'werewolf') {
    const wolves = priv.info.find((i) => i.kind === 'wolves' && i.step === 'werewolf')
    if (wolves?.kind === 'wolves' && wolves.seats.length === 0 && !sent.has('loneWolf'))
      return { kind: 'loneWolf', mode: 'center1', prompt: '혼자인 늑대는 가운데 카드 1장을 볼 수 있어요' }
    return null
  }
  if ((step === 'seer' || step === 'robber' || step === 'troublemaker' || step === 'drunk') && priv.dealt === step && !sent.has(step))
    return byRole(step, step)
  return null
}

function Night({ game, priv, uid, names, now }: Props & { priv: WolfPrivate; names: string[]; now: number }) {
  const segments = nightSegments(game.startedAt!.toMillis(), game.steps, game.stepSec)
  const seg = segmentAt(segments, now)
  // 보낸 행동 (같은 단계 화면이 다시 그려져도 한 번만)
  const [sent, setSent] = useState<Set<ActionKind>>(new Set())
  // 가짜 선택을 마친 단계
  const [decoyDone, setDecoyDone] = useState<Set<number>>(new Set())
  const mySeat = priv.seat

  if (seg.kind === 'card') {
    return (
      <div className="space-y-6 text-center">
        <p className="text-sm opacity-80">
          내 카드를 확인하세요 · <Countdown end={seg.end} now={now} />
        </p>
        <RoleCard role={priv.dealt} />
        <p className="text-xs opacity-60">곧 밤이 시작돼요. 폰은 나만 보이게 들어 주세요</p>
      </div>
    )
  }
  if (seg.kind === 'done') return <Waiting text="아침이 밝아 와요…" />

  const action = myAction(seg.step, priv, sent)
  const stepInfos = priv.info.filter((i) => i.step === seg.step)
  // 행동을 보냈는데 결과가 아직 안 왔으면 기다린다
  const waitingResult = !action && stepInfos.length === 0 && [...sent].some((k) => stepOfAction(k) === seg.step)
  const submit = async (kind: ActionKind, targets: number[]) => {
    setSent((prev) => new Set(prev).add(kind))
    try {
      await sendAction(game.id, uid, kind, targets)
    } catch (error) {
      console.error(error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-xs opacity-60">
          밤 {seg.index + 1}/{game.steps.length} · <Countdown end={seg.end} now={now} />
        </p>
        <p className="text-xl font-bold">{stepCall(seg.step)}</p>
      </div>

      {stepInfos.length > 0 && (
        <ul className="space-y-2">
          {stepInfos.map((info, i) => (
            <li key={i} className="border-2 border-yellow-300/60 bg-yellow-300/10 p-3 text-center text-sm">
              <InfoLine info={info} names={names} mySeat={mySeat} />
            </li>
          ))}
        </ul>
      )}

      {action ? (
        <div className="space-y-3">
          <p className="text-center text-sm">{action.prompt}</p>
          <Picker key={`${seg.index}-${action.kind}`} mode={action.mode} names={names} mySeat={mySeat} onConfirm={(t) => submit(action.kind, t)} />
        </div>
      ) : waitingResult ? (
        <p className="py-6 text-center text-sm opacity-70">확인하는 중…</p>
      ) : decoyDone.has(seg.index) || stepInfos.length > 0 ? (
        <p className="py-6 text-center text-sm opacity-70">눈을 감고 다음 차례를 기다려요…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm">아무 카드나 하나 골라 주세요</p>
          <Picker
            key={`${seg.index}-decoy`}
            mode="any1"
            names={names}
            mySeat={mySeat}
            onConfirm={() => setDecoyDone((prev) => new Set(prev).add(seg.index))}
          />
        </div>
      )}
    </div>
  )
}

/** 밤 정보 한 줄 (볼 수 있는 카드는 그림도) */
function InfoLine({ info, names, mySeat }: { info: Info; names: string[]; mySeat: number }) {
  const cards = info.kind === 'view' ? info.cards : info.kind === 'copy' ? [{ pos: info.target, role: info.role }] : []
  return (
    <div className="space-y-2">
      {cards.length > 0 && (
        <div className="flex justify-center gap-2">
          {cards.map((c) => (
            <RoleArt key={c.pos} role={c.role} size={64} />
          ))}
        </div>
      )}
      <p>{infoText(info, names, mySeat)}</p>
    </div>
  )
}

// ---------- 낮 ----------

function Day({ game, priv, uid, names, now }: Props & { priv: WolfPrivate; names: string[]; now: number }) {
  const done = game.readyIds.includes(uid)
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-xl font-bold">아침이에요! 누가 늑대인간일까요?</p>
        <p className="text-sm text-muted-foreground">
          토론 남은 시간 <Countdown end={game.dayEndAt!.toMillis()} now={now} className="font-bold text-foreground" />
        </p>
      </div>
      <MyNight priv={priv} names={names} />
      <RolesInGame roles={game.roles} />
      <Button
        className="w-full"
        size="lg"
        variant={done ? 'outline' : 'default'}
        disabled={done || busy}
        onClick={async () => {
          setBusy(true)
          try {
            await markDiscussionDone(game.id, uid)
          } catch (error) {
            toast.error(toErrorMessage(error))
          } finally {
            setBusy(false)
          }
        }}
      >
        {done ? `투표 기다리는 중 (${game.readyIds.length}/${game.players.length})` : '토론 끝, 투표하자'}
      </Button>
    </div>
  )
}

/** 내가 밤에 알게 된 것 (처음 카드 포함, 지금 카드는 모른다) */
function MyNight({ priv, names }: { priv: WolfPrivate; names: string[] }) {
  return (
    <section className="space-y-2">
      <SectionTitle>내가 아는 것</SectionTitle>
      <div className="flex items-center gap-3 border-2 border-border bg-card p-3">
        <RoleArt role={priv.dealt} size={64} />
        <div className="min-w-0 text-sm">
          <p>
            처음 받은 카드: <b>{roleName(priv.dealt)}</b>
          </p>
          <p className="text-xs text-muted-foreground">밤사이 카드가 바뀌었을 수도 있어요</p>
        </div>
      </div>
      {priv.info.length > 0 && (
        <ul className="space-y-1 text-sm">
          {priv.info.map((info, i) => (
            <li key={i} className="border-l-4 border-primary/60 pl-2">
              <span className="text-xs text-muted-foreground">{STEP_LABEL[info.step]} · </span>
              {infoText(info, names, priv.seat)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RolesInGame({ roles }: { roles: RoleId[] }) {
  return (
    <section className="space-y-2">
      <SectionTitle>이번 판 카드 ({roles.length}장, 3장은 가운데)</SectionTitle>
      <ul className="flex flex-wrap gap-1.5">
        {roles.map((r, i) => (
          <li key={i} title={ROLES[r].ability}>
            <RoleArt role={r} size={32} />
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------- 투표 ----------

function VoteView({ game, priv, uid, names, now }: Props & { priv: WolfPrivate; names: string[]; now: number }) {
  const [voted, setVoted] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const vote = async (seat: number) => {
    setBusy(true)
    try {
      await sendVote(game.id, uid, game.players[seat])
      setVoted(seat)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-xl font-bold">늑대인간이라고 생각하는 사람은?</p>
        <p className="text-sm text-muted-foreground">
          <Countdown end={game.voteEndAt!.toMillis()} now={now} /> · 끝나기 전엔 바꿀 수 있어요
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {names.map((name, seat) =>
          seat === priv.seat ? null : (
            <li key={seat}>
              <Button className="w-full" size="lg" variant={voted === seat ? 'default' : 'outline'} disabled={busy} onClick={() => vote(seat)}>
                {name}
              </Button>
            </li>
          ),
        )}
      </ul>
      <p className="text-center text-sm text-muted-foreground">
        {voted === null ? '아직 투표 전이에요' : `${names[voted]} 님에게 투표했어요`}
      </p>
      <MyNight priv={priv} names={names} />
    </div>
  )
}

// ---------- 결과 ----------

function Result({ game, uid, names }: { game: WolfGame; uid: string; names: string[] }) {
  const r = game.result!
  const seat = game.players.indexOf(uid)
  const won = r.winnerIds.includes(uid)
  const isHost = game.hostId === uid
  const [busy, setBusy] = useState(false)
  const headline = r.villageWins ? '마을 팀 승리!' : r.werewolfWins ? '늑대 팀 승리!' : r.final.some((f, i) => f === 'tanner' && r.deaths.includes(i)) ? '무두장이 승리!' : '아무도 못 이겼어요'

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Trophy className="mx-auto size-8 text-primary" />
        <p className="text-2xl font-bold">{headline}</p>
        <p className={cn('font-bold', won ? 'text-green-700' : 'text-destructive')}>
          {won ? '나는 이겼어요' : '나는 졌어요'} · 마지막 카드 {roleName(r.final[seat])}
        </p>
        <p className="text-sm text-muted-foreground">
          {r.deaths.length ? `죽은 사람: ${r.deaths.map((d) => names[d]).join(', ')}` : '아무도 죽지 않았어요'}
        </p>
      </div>

      <section className="space-y-2">
        <SectionTitle>모두의 카드</SectionTitle>
        <ul className="space-y-2">
          {names.map((name, i) => (
            <li key={i} className={cn('flex items-center gap-2 border-2 border-border bg-card p-2', r.deaths.includes(i) && 'opacity-70')}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {name} {r.deaths.includes(i) && <span className="text-xs text-destructive">사망</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  투표: {r.votes[i] >= 0 ? names[r.votes[i]] : '안 함'} · {r.winnerIds.includes(game.players[i]) ? '승리' : '패배'}
                </p>
              </div>
              <RoleArt role={r.dealt[i]} size={32} />
              <span className="text-xs">→</span>
              <RoleArt role={r.final[i]} size={32} />
            </li>
          ))}
          <li className="flex items-center gap-2 border-2 border-dashed border-border p-2">
            <p className="min-w-0 flex-1 text-sm font-bold">가운데</p>
            {r.centerDealt.map((role, i) => (
              <span key={i} className="flex items-center gap-0.5">
                <RoleArt role={role} size={32} />
                {role !== r.centerFinal[i] && (
                  <>
                    <span className="text-xs">→</span>
                    <RoleArt role={r.centerFinal[i]} size={32} />
                  </>
                )}
              </span>
            ))}
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <SectionTitle>밤에 있었던 일</SectionTitle>
        {r.log.length === 0 ? (
          <p className="text-sm text-muted-foreground">아무 일도 없었어요</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {r.log.map((e, i) => (
              <li key={i} className="border-l-4 border-primary/60 pl-2">
                <span className="text-xs text-muted-foreground">{STEP_LABEL[e.step]} · </span>
                {eventText(e, names)}
              </li>
            ))}
          </ol>
        )}
      </section>

      {isHost ? (
        <Button
          className="w-full"
          size="lg"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await backToLobby()
            } catch (error) {
              toast.error(toErrorMessage(error))
              setBusy(false)
            }
          }}
        >
          한 판 더 (대기실로)
        </Button>
      ) : (
        <p className="text-center text-sm text-muted-foreground">방장이 "한 판 더"를 누르면 대기실로 가요</p>
      )}
    </div>
  )
}

// ---------- 멈췄을 때 ----------

/** 방장 폰이 꺼져 판이 멈췄을 때: 방장은 판 그만하기, 다른 사람은 방을 대기로 되돌리기 */
function StuckHelp({ game, uid }: { game: WolfGame; uid: string }) {
  const [open, setOpen] = useState(false)
  if (game.phase === 'result') return null
  const isHost = game.hostId === uid
  return (
    <div className="pt-4 text-center">
      <Button variant="link" size="xs" className="opacity-60" onClick={() => setOpen(true)}>
        {isHost ? '판 그만하기' : '진행이 멈췄나요?'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isHost ? '이 판을 그만할까요?' : '방을 대기실로 되돌릴까요?'}
        description={
          isHost
            ? '모두 대기실로 돌아가요. 전적은 남지 않아요.'
            : '방장 폰의 연결이 끊겨 진행이 멈췄을 때만 써 주세요. 내가 방장이 되고 모두 대기실로 돌아가요.'
        }
        confirmLabel="되돌리기"
        destructive
        onConfirm={async () => {
          try {
            if (isHost) await setGamePhase(game.id, 'aborted')
            await (isHost ? backToLobby() : resetRoom(uid))
          } catch (error) {
            toast.error(toErrorMessage(error))
          }
        }}
      />
    </div>
  )
}

