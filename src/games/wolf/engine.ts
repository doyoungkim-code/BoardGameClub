import { ROLES, type RoleId, type Team } from '@/games/wolf/roles'

/**
 * 「한밤의 늑대」 게임 계산 (순수 함수: 화면·Firebase 와 무관).
 * 방장 폰의 자동 딜러(useWolfHost)가 이 함수들로 카드를 섞고, 밤 행동을 적용하고, 투표 결과를 낸다.
 *
 * 자리(position): 0..n-1 = 플레이어 자리(players 순서), n..n+2 = 가운데 카드 3장
 */

export const CENTER_COUNT = 3

/** 카드 한 장. 도플갱어 카드는 복사한 역할을 들고 다닌다 (카드가 옮겨져도 함께 간다) */
export type Card = { id: number; role: RoleId; copied: RoleId | null }

/** 밤 단계 (덱에 있는 역할은 가운데에 있어도 부른다: 빈 차례로 정보가 새지 않게) */
export type StepId =
  | 'doppelganger'
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  | 'doppelInsomniac'

/** 플레이어가 보내는 행동. doppelAct = 도플갱어가 복사한 역할(예언자·강도·말썽쟁이·주정뱅이)의 행동 */
export type ActionKind = 'copy' | 'doppelAct' | 'loneWolf' | 'seer' | 'robber' | 'troublemaker' | 'drunk'

/** 밤에 알게 된 것 (그 사람 화면에만 보인다) */
export type Info =
  | { kind: 'copy'; step: StepId; target: number; role: RoleId }
  | { kind: 'wolves'; step: StepId; seats: number[] }
  | { kind: 'masons'; step: StepId; seats: number[] }
  | { kind: 'view'; step: StepId; cards: { pos: number; role: RoleId }[] }
  | { kind: 'swap'; step: StepId; a: number; b: number }

/** 결과 화면에서 모두에게 보여 줄 밤 기록 */
export type NightEvent = { step: StepId; seat: number; action: ActionKind | 'look'; targets: number[]; role: RoleId }

export type WolfState = {
  n: number
  /** 처음 나눠 준 카드 (자리 순서 + 가운데 3장) */
  dealt: Card[]
  /** 지금 카드 */
  cards: Card[]
  log: NightEvent[]
  /** 이미 적용한 행동 (같은 행동을 두 번 적용하지 않게): `${seat}:${kind}` */
  done: string[]
}

// ---------- 구성 ----------

/** 인원별 추천 구성 (카드 = 인원 + 3). 규칙서 첫 판 추천을 따라 하나씩 더한다 */
const BASE: RoleId[] = ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager']
const ADD: RoleId[] = ['villager', 'villager', 'minion', 'drunk', 'insomniac', 'tanner', 'hunter']

export function recommendedRoles(players: number): RoleId[] {
  const n = Math.min(Math.max(players, 3), 10)
  return sortRoles([...BASE, ...ADD.slice(0, n - 3)])
}

export const sortRoles = (roles: RoleId[]) =>
  [...roles].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b])

const ORDER: RoleId[] = ['doppelganger', 'werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'villager', 'hunter', 'tanner']
const ORDER_INDEX = Object.fromEntries(ORDER.map((r, i) => [r, i])) as Record<RoleId, number>

/** 구성 검사: 장수 = 인원 + 3, 역할별 최대 수, 프리메이슨은 0 또는 2장. 문제가 있으면 이유 */
export function checkRoles(roles: RoleId[], players: number): string | null {
  if (players < 3) return '3명 이상 모여야 해요'
  if (players > 10) return '10명까지 할 수 있어요'
  if (roles.length !== players + CENTER_COUNT) return `카드는 인원 + 3 = ${players + CENTER_COUNT}장이어야 해요`
  for (const id of ORDER) {
    const count = roles.filter((r) => r === id).length
    if (count > ROLES[id].max) return `${ROLES[id].name}는 ${ROLES[id].max}장까지예요`
    if (id === 'mason' && count === 1) return '프리메이슨은 2장을 함께 넣어야 해요'
  }
  return null
}

// ---------- 섞기 ----------

/** 0 이상 1 미만의 난수 (기본: crypto) */
export type Random = () => number
export const cryptoRandom: Random = () => {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] / 2 ** 32
}

export function deal(roles: RoleId[], players: number, random: Random = cryptoRandom): WolfState {
  const cards: Card[] = roles.map((role, id) => ({ id, role, copied: null }))
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return { n: players, dealt: cards.map((c) => ({ ...c })), cards: cards.map((c) => ({ ...c })), log: [], done: [] }
}

// ---------- 자리·역할 ----------

export const isSeat = (s: WolfState, pos: number) => Number.isInteger(pos) && pos >= 0 && pos < s.n
export const isCenter = (s: WolfState, pos: number) => Number.isInteger(pos) && pos >= s.n && pos < s.n + CENTER_COUNT
export const centerPositions = (s: WolfState) => Array.from({ length: CENTER_COUNT }, (_, i) => s.n + i)

/** 카드가 지금 나타내는 역할 (도플갱어 카드는 복사한 역할) */
export const roleOf = (card: Card): RoleId => (card.role === 'doppelganger' && card.copied ? card.copied : card.role)

/** 밤에 이 자리 사람이 맡은 역할: 처음 받은 카드 기준 (도플갱어는 복사한 역할) */
export function nightRole(s: WolfState, seat: number): RoleId {
  const card = s.dealt[seat]
  if (card.role !== 'doppelganger') return card.role
  return s.dealt[seat].copied ?? 'doppelganger'
}

/** 처음 도플갱어였는지 */
export const wasDoppel = (s: WolfState, seat: number) => s.dealt[seat].role === 'doppelganger'

const doppelSeat = (s: WolfState) => s.dealt.findIndex((c, i) => i < s.n && c.role === 'doppelganger')
const copiedRole = (s: WolfState) => {
  const seat = doppelSeat(s)
  return seat >= 0 ? s.dealt[seat].copied : null
}

/** 밤에 늑대인간으로 깨는 자리 (처음 늑대인간 + 늑대인간을 복사한 도플갱어) */
export const wolfSeats = (s: WolfState) => seatsWithNightRole(s, 'werewolf')
const seatsWithNightRole = (s: WolfState, role: RoleId) =>
  Array.from({ length: s.n }, (_, i) => i).filter((i) => nightRole(s, i) === role)

// ---------- 밤 순서 ----------

export type NightStep = { id: StepId; /** 기본 단계 시간의 몇 배 */ units: number }

/** 덱 구성으로 밤 순서를 만든다. 도플갱어 단계는 복사 + 복사한 역할 행동까지 하므로 2배 */
export function nightSteps(roles: RoleId[]): NightStep[] {
  const has = (r: RoleId) => roles.includes(r)
  const steps: NightStep[] = []
  if (has('doppelganger')) steps.push({ id: 'doppelganger', units: 2 })
  for (const id of ['werewolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac'] as const) {
    if (has(id)) steps.push({ id, units: 1 })
  }
  // 도플갱어가 불면증 환자를 복사했을 때 맨 끝에 한 번 더 (덱에 둘 다 있으면 항상 부른다)
  if (has('doppelganger') && has('insomniac')) steps.push({ id: 'doppelInsomniac', units: 1 })
  return steps
}

/** 이 단계에 실제로 행동하는(깨는) 자리 */
export function actorsOf(s: WolfState, step: StepId): number[] {
  const seats = Array.from({ length: s.n }, (_, i) => i)
  switch (step) {
    case 'doppelganger':
      return seats.filter((i) => s.dealt[i].role === 'doppelganger')
    case 'insomniac':
      // 진짜 불면증 환자만 (도플갱어-불면증은 맨 끝 단계)
      return seats.filter((i) => s.dealt[i].role === 'insomniac')
    case 'doppelInsomniac':
      return seats.filter((i) => wasDoppel(s, i) && copiedRole(s) === 'insomniac')
    case 'seer':
    case 'robber':
    case 'troublemaker':
    case 'drunk':
      // 도플갱어가 복사한 이 역할들은 도플갱어 단계에서 이미 행동했다
      return seats.filter((i) => s.dealt[i].role === step)
    default:
      return seats.filter((i) => nightRole(s, i) === step)
  }
}

/** 이 단계에서 이 사람이 고를 행동 (없으면 null: 보기만 하거나 깨지 않음) */
export function actionFor(s: WolfState, step: StepId, seat: number): ActionKind | null {
  if (!actorsOf(s, step).includes(seat)) return null
  switch (step) {
    case 'doppelganger':
      if (!s.done.includes(`${seat}:copy`)) return 'copy'
      return isActing(copiedRole(s)) ? 'doppelAct' : null
    case 'werewolf':
      return wolfSeats(s).length === 1 ? 'loneWolf' : null
    case 'seer':
    case 'robber':
    case 'troublemaker':
    case 'drunk':
      return step
    default:
      return null
  }
}

/** 복사하면 도플갱어 단계에서 바로 행동하는 역할 */
const isActing = (r: RoleId | null) => r === 'seer' || r === 'robber' || r === 'troublemaker' || r === 'drunk'

/**
 * 단계가 시작될 때 저절로 알게 되는 것 (늑대끼리·하수인·프리메이슨·불면증 환자).
 * 돌려주는 값: 자리 → 정보
 */
export function stepStartInfo(s: WolfState, step: StepId): Map<number, Info> {
  const out = new Map<number, Info>()
  const actors = actorsOf(s, step)
  if (step === 'werewolf') {
    const wolves = wolfSeats(s)
    for (const seat of actors) out.set(seat, { kind: 'wolves', step, seats: wolves.filter((w) => w !== seat) })
  }
  if (step === 'minion') {
    for (const seat of actors) out.set(seat, { kind: 'wolves', step, seats: wolfSeats(s) })
  }
  if (step === 'mason') {
    const masons = seatsWithNightRole(s, 'mason')
    for (const seat of actors) out.set(seat, { kind: 'masons', step, seats: masons.filter((m) => m !== seat) })
  }
  if (step === 'insomniac' || step === 'doppelInsomniac') {
    for (const seat of actors) out.set(seat, { kind: 'view', step, cards: [{ pos: seat, role: roleOf(s.cards[seat]) }] })
  }
  return out
}

/** stepStartInfo 를 밤 기록에도 남긴다 (결과 화면용) */
export function logStepStart(s: WolfState, step: StepId): WolfState {
  const info = stepStartInfo(s, step)
  if (info.size === 0) return s
  const log = [...s.log]
  for (const [seat, i] of info) {
    const targets = i.kind === 'wolves' || i.kind === 'masons' ? i.seats : i.kind === 'view' ? i.cards.map((c) => c.pos) : []
    log.push({ step, seat, action: 'look', targets, role: nightRole(s, seat) })
  }
  return { ...s, log }
}

// ---------- 행동 적용 ----------

export type ApplyResult = { state: WolfState; info: Info | null }

const swap = (cards: Card[], a: number, b: number) => {
  const next = [...cards]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/**
 * 행동 적용. 이 단계에 이 사람이 할 수 있는 행동이 아니거나 대상이 잘못됐으면 null (무시).
 * info = 그 사람 화면에만 보여 줄 결과 (말썽쟁이·주정뱅이는 바꾸기만 하고 보지 못한다)
 */
export function applyAction(s: WolfState, seat: number, step: StepId, kind: ActionKind, targets: number[]): ApplyResult | null {
  if (!isSeat(s, seat) || actionFor(s, step, seat) !== kind) return null
  const key = `${seat}:${kind}`
  if (s.done.includes(key)) return null
  // 도플갱어가 복사한 역할로 하는 행동은 그 역할의 규칙을 그대로 쓴다
  const as: ActionKind = kind === 'doppelAct' ? (copiedRole(s) as ActionKind) : kind
  const t = targets
  const other = (p: number) => isSeat(s, p) && p !== seat
  const distinct = new Set(t).size === t.length
  let next: WolfState = { ...s, done: [...s.done, key] }
  let info: Info | null = null

  switch (as) {
    case 'copy': {
      if (t.length !== 1 || !other(t[0])) return null
      const role = roleOf(s.cards[t[0]])
      // 처음 받은 도플갱어 카드에 복사한 역할을 적는다 (그 카드가 지금 어디 있든 같은 카드)
      const cardId = s.dealt[seat].id
      const mark = (cards: Card[]) => cards.map((c) => (c.id === cardId ? { ...c, copied: role } : c))
      next = { ...next, dealt: mark(s.dealt), cards: mark(s.cards) }
      info = { kind: 'copy', step, target: t[0], role }
      break
    }
    case 'loneWolf': {
      if (t.length !== 1 || !isCenter(s, t[0])) return null
      info = { kind: 'view', step, cards: [{ pos: t[0], role: roleOf(s.cards[t[0]]) }] }
      break
    }
    case 'seer': {
      const one = t.length === 1 && other(t[0])
      const two = t.length === 2 && distinct && t.every((p) => isCenter(s, p))
      if (!one && !two) return null
      info = { kind: 'view', step, cards: t.map((pos) => ({ pos, role: roleOf(s.cards[pos]) })) }
      break
    }
    case 'robber': {
      if (t.length !== 1 || !other(t[0])) return null
      next = { ...next, cards: swap(s.cards, seat, t[0]) }
      // 바꾼 뒤 내 새 카드를 본다 (새 역할의 행동은 하지 않는다)
      info = { kind: 'view', step, cards: [{ pos: seat, role: roleOf(next.cards[seat]) }] }
      break
    }
    case 'troublemaker': {
      if (t.length !== 2 || !distinct || !t.every(other)) return null
      next = { ...next, cards: swap(s.cards, t[0], t[1]) }
      info = { kind: 'swap', step, a: t[0], b: t[1] }
      break
    }
    case 'drunk': {
      if (t.length !== 1 || !isCenter(s, t[0])) return null
      next = { ...next, cards: swap(s.cards, seat, t[0]) }
      info = { kind: 'swap', step, a: seat, b: t[0] }
      break
    }
    default:
      return null
  }
  next = { ...next, log: [...next.log, { step, seat, action: kind, targets: t, role: nightRole(next, seat) }] }
  return { state: next, info }
}

// ---------- 투표·승패 ----------

/** 최종 역할 (밤이 끝난 뒤 그 자리 카드) */
export const finalRole = (s: WolfState, seat: number) => roleOf(s.cards[seat])

/** 역할의 팀. 복사 안 한 도플갱어 카드는 마을 편으로 본다 */
export function teamOf(role: RoleId): Exclude<Team, 'copy'> {
  const t = ROLES[role].team
  return t === 'copy' ? 'village' : t
}

/**
 * 투표: votes[자리] = 지목한 자리 (투표 안 했으면 없음).
 * 가장 많이 받은 사람이 죽는다(동점이면 모두). 아무도 2표 이상 못 받으면 아무도 안 죽는다.
 * 사냥꾼이 죽으면 사냥꾼이 지목한 사람도 죽는다 (연쇄).
 */
export function resolveVotes(s: WolfState, votes: Record<number, number>): number[] {
  const count = new Map<number, number>()
  for (const [voter, target] of Object.entries(votes)) {
    if (!isSeat(s, Number(voter)) || !isSeat(s, target) || Number(voter) === target) continue
    count.set(target, (count.get(target) ?? 0) + 1)
  }
  const max = Math.max(0, ...count.values())
  if (max < 2) return []
  const dead = [...count.entries()].filter(([, v]) => v === max).map(([seat]) => seat)
  for (let i = 0; i < dead.length; i++) {
    const seat = dead[i]
    const target = votes[seat]
    if (finalRole(s, seat) === 'hunter' && target !== undefined && isSeat(s, target) && !dead.includes(target)) dead.push(target)
  }
  return dead.sort((a, b) => a - b)
}

export type Outcome = {
  deaths: number[]
  /** 자리별 승리 여부 */
  won: boolean[]
  villageWins: boolean
  werewolfWins: boolean
  /** 죽어서 이긴 무두장이 자리 */
  tannerWinners: number[]
}

export function outcome(s: WolfState, deaths: number[]): Outcome {
  const seats = Array.from({ length: s.n }, (_, i) => i)
  const final = seats.map((i) => finalRole(s, i))
  const wolves = seats.filter((i) => final[i] === 'werewolf')
  const wolfDied = deaths.some((d) => final[d] === 'werewolf')
  const tannerWinners = deaths.filter((d) => final[d] === 'tanner')
  const tannerDied = tannerWinners.length > 0

  // 마을: 늑대가 하나라도 죽으면 승. 플레이어 중 늑대가 없으면 아무도 안 죽어야 승
  const villageWins = wolfDied || (wolves.length === 0 && deaths.length === 0)
  // 늑대 팀: 늑대가 있고 아무 늑대도 안 죽고 무두장이도 안 죽으면 승.
  // 늑대가 없으면 하수인은 자기 말고 누군가 죽으면 승 (무두장이가 죽으면 패)
  const minionWinsAlone = (seat: number) => deaths.some((d) => d !== seat) && !tannerDied
  const werewolfWins = wolves.length > 0 ? !wolfDied && !tannerDied : seats.some((i) => final[i] === 'minion' && minionWinsAlone(i))

  const won = seats.map((i) => {
    const team = teamOf(final[i])
    if (team === 'tanner') return deaths.includes(i)
    if (team === 'werewolf') return wolves.length > 0 ? werewolfWins : final[i] === 'minion' && minionWinsAlone(i)
    return villageWins
  })
  return { deaths, won, villageWins, werewolfWins, tannerWinners }
}
