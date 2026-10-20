import type { ActionKind, NightStep, StepId } from '@/games/wolf/engine'

/**
 * 밤 진행 시간표. 모든 폰이 서버 시각으로 같은 계산을 해서 같은 순간에 같은 단계를 보여 준다.
 * 판 시작(startedAt) → 카드 확인 → 밤 단계들 → 낮
 */

/** 처음 카드 확인 시간(초) */
export const CARD_SEC = 12
/** 투표 시간(초) */
export const VOTE_SEC = 60
/** 단계가 끝난 뒤에도 행동을 받아 주는 여유(ms): 네트워크로 조금 늦게 닿는 것까지 */
export const ACTION_GRACE_MS = 2500

export type NightSegment =
  | { kind: 'card'; start: number; end: number }
  | { kind: 'step'; index: number; step: StepId; start: number; end: number }
  | { kind: 'done'; start: number; end: number }

export function nightSegments(startedAt: number, steps: NightStep[], stepSec: number): NightSegment[] {
  const out: NightSegment[] = []
  let t = startedAt
  out.push({ kind: 'card', start: t, end: (t += CARD_SEC * 1000) })
  steps.forEach((s, index) => {
    const start = t
    t += s.units * stepSec * 1000
    out.push({ kind: 'step', index, step: s.id, start, end: t })
  })
  out.push({ kind: 'done', start: t, end: Infinity })
  return out
}

/** 지금 어느 구간인지 */
export function segmentAt(segments: NightSegment[], now: number): NightSegment {
  return segments.find((s) => now >= s.start && now < s.end) ?? segments[0]
}

/** 행동 종류 → 그 행동을 하는 밤 단계 */
export function stepOfAction(kind: ActionKind): StepId {
  switch (kind) {
    case 'copy':
    case 'doppelAct':
      return 'doppelganger'
    case 'loneWolf':
      return 'werewolf'
    default:
      return kind
  }
}

export const STEP_LABEL: Record<StepId, string> = {
  doppelganger: '도플갱어',
  werewolf: '늑대인간',
  minion: '하수인',
  mason: '프리메이슨',
  seer: '예언자',
  robber: '강도',
  troublemaker: '말썽쟁이',
  drunk: '주정뱅이',
  insomniac: '불면증 환자',
  doppelInsomniac: '도플갱어 (불면증 환자)',
}
