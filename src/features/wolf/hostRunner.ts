import { onSnapshot, type Timestamp } from 'firebase/firestore'
import {
  applyAction,
  centerPositions,
  finalRole,
  logStepStart,
  outcome,
  resolveVotes,
  stepStartInfo,
  type ActionKind,
} from '@/games/wolf/engine'
import { ACTION_GRACE_MS, nightSegments, stepOfAction, VOTE_SEC } from '@/games/wolf/timeline'
import { serverNow } from '@/lib/serverClock'
import {
  actionsCol,
  addInfo,
  loadSecret,
  saveSecret,
  setGamePhase,
  subscribeGame,
  votesCol,
  type WolfSecret,
} from '@/services/wolf'
import type { WolfGame, WolfResult } from '@/types/wolf'

type ActionDoc = { id: string; uid: string; kind: ActionKind; targets: number[]; at: number }

/**
 * 자동 딜러: 방장 폰에서만 돈다. 카드 전체를 아는 건 이 폰뿐이고, 각자에게는 그 사람 몫의 결과만 보낸다.
 * - 밤: 단계가 시작되면 늑대끼리·하수인·프리메이슨·불면증 환자에게 정보를 주고, 들어온 행동을 순서대로 적용
 * - 낮: 모두 "토론 끝"을 누르거나 시간이 다 되면 투표로
 * - 투표: 모두 투표하거나 시간이 다 되면 결과 공개
 * 계산 상태는 secret/state 에 저장해서, 방장 폰이 잠깐 꺼졌다 돌아와도 이어서 진행한다.
 * 반환값을 호출하면 멈춘다.
 */
export function runWolfHost(gameId: string): () => void {
  let stopped = false
  let busy = false
  let secret: WolfSecret | null = null
  let game: WolfGame | null = null
  let actions: ActionDoc[] = []
  let votes: Record<string, string> = {}
  // 같은 단계 넘기기를 두 번 보내지 않게 (판 문서 갱신이 돌아오기 전에 다시 돌 수 있다)
  const sent = new Set<string>()
  const once = async (key: string, fn: () => Promise<unknown>) => {
    if (sent.has(key)) return
    sent.add(key)
    await fn()
  }

  const kick = () => {
    if (busy || stopped || !secret || !game) return
    busy = true
    tick()
      .catch((error) => console.error('자동 딜러 오류', error))
      .finally(() => {
        busy = false
      })
  }

  const unsubs = [
    subscribeGame(gameId, (g) => {
      game = g
      kick()
    }),
    onSnapshot(actionsCol(gameId), (snap) => {
      actions = snap.docs.map((d) => {
        const data = d.data({ serverTimestamps: 'estimate' })
        return { id: d.id, uid: data.uid, kind: data.kind, targets: data.targets, at: (data.at as Timestamp).toMillis() }
      })
      kick()
    }),
    onSnapshot(votesCol(gameId), (snap) => {
      votes = Object.fromEntries(snap.docs.map((d) => [d.id, d.get('target') as string]))
      kick()
    }),
  ]
  loadSecret(gameId)
    .then((s) => {
      secret = s
      kick()
    })
    .catch((error) => console.error('딜러 상태 불러오기 실패', error))
  const timer = setInterval(kick, 400)

  async function tick() {
    const g = game!
    const now = serverNow()
    if (g.phase === 'night' && g.startedAt) await night(g, now)
    else if (g.phase === 'day' && g.dayEndAt) {
      if (g.readyIds.length >= g.players.length || now >= g.dayEndAt.toMillis())
        await once('vote', () => setGamePhase(gameId, 'vote', { voteEndAt: now + VOTE_SEC * 1000 }))
    } else if (g.phase === 'vote' && g.voteEndAt) {
      const allVoted = g.players.every((uid) => votes[uid])
      if (allVoted || now >= g.voteEndAt.toMillis() + 1500) await once('result', () => finish(g))
    }
  }

  async function night(g: WolfGame, now: number) {
    const s = secret!
    const segments = nightSegments(g.startedAt!.toMillis(), g.steps, g.stepSec)
    const stepSegs = segments.filter((seg) => seg.kind === 'step')
    let changed = false

    // 시작할 차례가 된 단계: 먼저 그 전 단계 행동을 다 적용한 뒤 시작 정보를 나눠 준다
    while (s.startedSteps < stepSegs.length && stepSegs[s.startedSteps].start <= now) {
      const seg = stepSegs[s.startedSteps]
      changed = (await applyPending(g, segments)) || changed
      const info = stepStartInfo(s.state, seg.step)
      s.state = logStepStart(s.state, seg.step)
      s.startedSteps += 1
      changed = true
      await Promise.all([...info].map(([seat, i]) => addInfo(gameId, g.players[seat], i)))
    }
    changed = (await applyPending(g, segments)) || changed
    if (changed) await saveSecret(gameId, s)

    const done = segments[segments.length - 1]
    if (now >= done.start + ACTION_GRACE_MS) {
      await once('day', () => setGamePhase(gameId, 'day', { dayEndAt: now + g.discussSec * 1000 }))
    }
  }

  /** 아직 적용 안 한 행동을 시각 순서대로 적용. 그 단계 시간 안에 들어온 것만 받는다 */
  async function applyPending(g: WolfGame, segments: ReturnType<typeof nightSegments>) {
    const s = secret!
    const pending = actions.filter((a) => !s.processed.includes(a.id)).sort((a, b) => a.at - b.at)
    let changed = false
    for (const a of pending) {
      const step = stepOfAction(a.kind)
      const seg = segments.find((x) => x.kind === 'step' && x.step === step)
      // 아직 시작 안 한 단계의 행동은 나중에 (시작 정보를 먼저 줘야 순서가 맞다)
      if (seg && seg.kind === 'step' && s.startedSteps <= seg.index) continue
      s.processed = [...s.processed, a.id]
      changed = true
      if (!seg || a.at < seg.start - 1000 || a.at > seg.end + ACTION_GRACE_MS) continue
      const seat = g.players.indexOf(a.uid)
      const result = applyAction(s.state, seat, step, a.kind, a.targets)
      if (!result) continue
      s.state = result.state
      if (result.info) await addInfo(gameId, a.uid, result.info)
    }
    return changed
  }

  async function finish(g: WolfGame) {
    const s = secret!
    const seatOf = (uid: string) => g.players.indexOf(uid)
    const voteSeats: Record<number, number> = {}
    for (const [voter, target] of Object.entries(votes)) {
      if (seatOf(voter) >= 0 && seatOf(target) >= 0) voteSeats[seatOf(voter)] = seatOf(target)
    }
    const deaths = resolveVotes(s.state, voteSeats)
    const o = outcome(s.state, deaths)
    const seats = g.players.map((_, i) => i)
    const result: WolfResult = {
      dealt: seats.map((i) => s.state.dealt[i].role),
      final: seats.map((i) => finalRole(s.state, i)),
      centerDealt: centerPositions(s.state).map((p) => s.state.dealt[p].role),
      centerFinal: centerPositions(s.state).map((p) => finalRole(s.state, p)),
      deaths,
      votes: seats.map((i) => voteSeats[i] ?? -1),
      winnerIds: g.players.filter((_, i) => o.won[i]),
      villageWins: o.villageWins,
      werewolfWins: o.werewolfWins,
      log: s.state.log,
    }
    await setGamePhase(gameId, 'result', { result })
  }

  return () => {
    stopped = true
    clearInterval(timer)
    unsubs.forEach((u) => u())
  }
}
