import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FirebaseError } from 'firebase/app'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { CalendarCheck, Coins, Dices } from '@/components/icons'
import { PageHeader } from '@/components/PageHeader'
import { SectionTitle } from '@/components/SectionTitle'
import { CardSkeleton } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { coinsOf, DICE_XP, diceCount, type RollKind } from '@/data/dice'
import { markTodayRolled, saveEventRollCount } from '@/features/dice/diceCache'
import { DiceTray } from '@/features/dice/DiceTray'
import { toErrorMessage } from '@/lib/format'
import type { TrayState } from '@/pixel/scenes/diceTray'
import { claimRoll, facesOf, fetchDiceStatus, rollDice, type DiceStatus, type RollResult } from '@/services/dice'
import { useAuth } from '@/stores/auth'
import type { ClubEvent } from '@/types/event'

const now = () => performance.now() / 1000
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const KIND_LABEL: Record<RollKind, string> = { day: '오늘의 주사위', event: '출석 주사위' }

/** 굴리다 난 오류를 회원에게 보여줄 말로 */
function rollErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'offline') return '인터넷에 연결되면 굴릴 수 있어요'
  if (error instanceof FirebaseError && error.code === 'permission-denied') return '이미 굴렸거나 굴릴 수 없는 주사위예요'
  return toErrorMessage(error)
}

/** 주사위 상태를 읽고, 받는 도중 끊겼던 굴림이 있으면 마저 받는다 */
async function loadDiceStatus(uid: string) {
  let next = await fetchDiceStatus(uid)
  if (next.unclaimed.length > 0) {
    for (const roll of next.unclaimed) await claimRoll(uid, roll.id)
    toast.success('받지 못했던 주사위 보상을 받았어요')
    next = await fetchDiceStatus(uid)
  }
  if (next.todayRolled) markTodayRolled(uid)
  saveEventRollCount(uid, next.eventRollCount)
  return next
}

/** /dice — 출석하거나 매일 처음 들어오면 주사위를 굴려 경험치와 코인을 받는다 */
export function DicePage() {
  const profile = useAuth((s) => s.profile)!
  const uid = profile.uid
  const [status, setStatus] = useState<DiceStatus | null>(null)
  const [tray, setTray] = useState<TrayState>({ mode: 'idle', faces: [5, 3], since: 0 })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // 이번에 굴린 결과 (최근 기록 위에 붙인다. 서버에서 다시 읽지 않으려고)
  const [fresh, setFresh] = useState<RollResult[]>([])

  // 다시 불러오기 (굴리다 실패하면 서버 상태로 맞춘다)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let canceled = false
    loadDiceStatus(uid)
      .then((next) => {
        if (!canceled) setStatus(next)
      })
      .catch((error) => {
        console.error('주사위 불러오기 실패', error)
        toast.error(toErrorMessage(error))
      })
    return () => {
      canceled = true
    }
  }, [uid, reloadKey])

  /** 하나 굴리기 (애니메이션 + 기록 + 화면 반영) */
  const rollOne = async (kind: RollKind, event: ClubEvent | null, minMs = 900) => {
    setTray({ mode: 'rolling', faces: Array(diceCount(kind)).fill(1), since: now() })
    const [result] = await Promise.all([rollDice(uid, kind, event?.id ?? null), sleep(minMs)])
    setTray({ mode: 'done', faces: result.faces, since: now() })
    setFresh((prev) => [result, ...prev])
    setStatus((prev) => {
      if (!prev) return prev
      if (kind === 'day') {
        markTodayRolled(uid)
        return { ...prev, todayRolled: true }
      }
      saveEventRollCount(uid, prev.eventRollCount + 1)
      return {
        ...prev,
        pendingEvents: prev.pendingEvents.filter((e) => e.id !== event?.id),
        eventRollCount: prev.eventRollCount + 1,
      }
    })
    return result
  }

  const run = async (task: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await task()
    } catch (error) {
      console.error('주사위 굴리기 실패', error)
      setTray((prev) => ({ ...prev, mode: 'idle' }))
      toast.error(rollErrorMessage(error))
      setReloadKey((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  const rollToday = () =>
    run(async () => {
      const r = await rollOne('day', null)
      setMessage(`${r.faces.join(' + ')} → 코인 +${r.coins} · 경험치 +${r.xp}`)
    })

  const rollEvent = (event: ClubEvent) =>
    run(async () => {
      const r = await rollOne('event', event)
      setMessage(`${r.faces.join(' + ')} → 코인 +${r.coins} · 경험치 +${r.xp}`)
    })

  /** 남은 출석 주사위를 하나씩 차례로 굴린다 (한꺼번에 기록하면 서버 시각이 같아 눈이 모두 같아진다) */
  const rollAll = (events: ClubEvent[]) =>
    run(async () => {
      let coins = 0
      for (const [i, event] of events.entries()) {
        setMessage(`출석 주사위 ${i + 1} / ${events.length}`)
        coins += (await rollOne('event', event, 450)).coins
      }
      setMessage(`출석 주사위 ${events.length}개 → 코인 +${coins} · 경험치 +${events.length * DICE_XP}`)
    })

  const pending = status?.pendingEvents ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="주사위"
        subtitle="출석하거나 매일 처음 들어오면 굴릴 수 있어요"
        actions={
          <span className="flex items-center gap-1 text-sm text-primary" aria-label={`코인 ${profile.coins ?? 0}개`}>
            <Coins className="size-6" />
            {(profile.coins ?? 0).toLocaleString()}
          </span>
        }
      />

      <div className="space-y-2">
        <DiceTray state={tray} />
        <p className="min-h-6 text-center text-sm text-primary" aria-live="polite">
          {message ?? (busy ? '굴리는 중…' : '')}
        </p>
      </div>

      {!status ? (
        <CardSkeleton count={2} />
      ) : (
        <>
          <Card className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <Dices className="size-6 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">오늘의 주사위</p>
                <p className="text-xs text-muted-foreground">
                  {status.todayRolled ? '오늘은 굴렸어요. 내일 또 굴릴 수 있어요' : '하루 한 번, 주사위 1개'}
                </p>
              </div>
              <Button disabled={busy || status.todayRolled} onClick={() => void rollToday()}>
                굴리기
              </Button>
            </CardContent>
          </Card>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle count={pending.length > 0 ? `${pending.length}개` : undefined}>출석 주사위</SectionTitle>
              {pending.length > 1 && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void rollAll(pending)}>
                  모두 굴리기
                </Button>
              )}
            </div>
            {pending.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="굴릴 출석 주사위가 없어요"
                description="모임에 출석하면 주사위 2개를 굴릴 수 있어요"
                size="sm"
              />
            ) : (
              <ul className="divide-y overflow-hidden pixel-border bg-card">
                {pending.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.startAt.toDate(), 'yyyy. M. d. (E)', { locale: ko })}
                      </p>
                    </div>
                    <Button size="sm" disabled={busy} onClick={() => void rollEvent(event)}>
                      굴리기
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle>내 기록</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="pixel-border bg-card py-3">
                <p className="text-xl font-bold text-primary">{(profile.coins ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">코인</p>
              </div>
              <div className="pixel-border bg-card py-3">
                <p className="text-xl font-bold">{(profile.diceXp ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">주사위 경험치</p>
              </div>
            </div>
            <RecentRolls fresh={fresh} status={status} />
          </section>
        </>
      )}
    </div>
  )
}

/** 최근 굴림: 이번에 굴린 것 + 서버에서 읽은 최근 10개 */
function RecentRolls({ fresh, status }: { fresh: RollResult[]; status: DiceStatus }) {
  const freshIds = new Set(fresh.map((r) => r.rollId))
  const rows = [
    ...fresh.map((r) => ({ id: r.rollId, kind: r.kind, faces: r.faces, when: '방금' })),
    ...status.recent
      .filter((roll) => !freshIds.has(roll.id))
      .map((roll) => ({
        id: roll.id,
        kind: roll.kind,
        faces: facesOf(roll) ?? [],
        when: roll.rolledAt ? format(roll.rolledAt.toDate(), 'M. d.', { locale: ko }) : '',
      })),
  ].slice(0, 10)

  if (rows.length === 0) return null
  return (
    <ul className="divide-y overflow-hidden pixel-border bg-card">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-3 px-4 py-2 text-sm">
          <span className="w-10 shrink-0 text-xs text-muted-foreground">{row.when}</span>
          <span className="min-w-0 flex-1 truncate">{KIND_LABEL[row.kind]}</span>
          <span className="text-muted-foreground">{row.faces.join(' + ')}</span>
          <span className="w-12 text-right text-primary">+{coinsOf(row.faces)}</span>
        </li>
      ))}
    </ul>
  )
}
