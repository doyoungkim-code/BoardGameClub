import { describe, expect, it } from 'vitest'
import {
  actionFor,
  actorsOf,
  applyAction,
  checkRoles,
  deal,
  finalRole,
  nightRole,
  nightSteps,
  outcome,
  recommendedRoles,
  resolveVotes,
  stepStartInfo,
  type ActionKind,
  type StepId,
  type WolfState,
} from '@/games/wolf/engine'
import type { RoleId } from '@/games/wolf/roles'

/** 섞지 않고 정해진 순서로 나눈 상태: seats = 자리 순서, center = 가운데 3장 */
function make(seats: RoleId[], center: RoleId[] = ['villager', 'villager', 'villager']): WolfState {
  const roles = [...seats, ...center]
  let i = 0
  return deal(roles, seats.length, () => {
    // Fisher–Yates 가 아무것도 바꾸지 않게: j = i
    i++
    return 0.999999
  })
}

/** 행동을 적용하고 상태만 돌려준다 (실패하면 테스트 실패) */
function act(s: WolfState, seat: number, step: StepId, kind: ActionKind, targets: number[]) {
  const r = applyAction(s, seat, step, kind, targets)
  expect(r).not.toBeNull()
  return r!
}

describe('구성', () => {
  it('인원별 추천 구성은 인원 + 3장이고 검사를 통과한다', () => {
    for (let n = 3; n <= 10; n++) {
      const roles = recommendedRoles(n)
      expect(roles).toHaveLength(n + 3)
      expect(checkRoles(roles, n)).toBeNull()
    }
  })

  it('장수·최대 수·프리메이슨 2장 규칙을 검사한다', () => {
    expect(checkRoles(['werewolf', 'seer', 'robber', 'villager', 'villager'], 3)).not.toBeNull()
    expect(checkRoles(['werewolf', 'werewolf', 'werewolf', 'seer', 'robber', 'villager'], 3)).toMatch('늑대인간')
    expect(checkRoles(['werewolf', 'mason', 'seer', 'robber', 'villager', 'villager'], 3)).toMatch('프리메이슨')
    expect(checkRoles(['werewolf', 'mason', 'mason', 'robber', 'villager', 'villager'], 3)).toBeNull()
  })

  it('섞어도 카드 구성은 그대로다', () => {
    const roles = recommendedRoles(6)
    const s = deal(roles, 6)
    expect([...s.cards.map((c) => c.role)].sort()).toEqual([...roles].sort())
    expect(s.cards).toHaveLength(9)
  })

  it('make 는 순서를 그대로 둔다', () => {
    const s = make(['werewolf', 'seer', 'robber'], ['troublemaker', 'villager', 'drunk'])
    expect(s.cards.map((c) => c.role)).toEqual(['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'drunk'])
  })
})

describe('밤 순서', () => {
  it('덱에 있는 역할만, 정해진 순서로 부른다 (가운데에 있어도 부른다)', () => {
    const steps = nightSteps(['doppelganger', 'werewolf', 'werewolf', 'seer', 'drunk', 'insomniac', 'villager'])
    expect(steps.map((s) => s.id)).toEqual(['doppelganger', 'werewolf', 'seer', 'drunk', 'insomniac', 'doppelInsomniac'])
    expect(steps[0].units).toBe(2)
  })

  it('불면증 환자가 없으면 도플갱어-불면증 단계도 없다', () => {
    expect(nightSteps(['doppelganger', 'werewolf', 'seer']).map((s) => s.id)).toEqual(['doppelganger', 'werewolf', 'seer'])
  })
})

describe('늑대인간·하수인·프리메이슨', () => {
  it('늑대끼리 서로 확인한다', () => {
    const s = make(['werewolf', 'seer', 'werewolf', 'villager'])
    const info = stepStartInfo(s, 'werewolf')
    expect(info.get(0)).toEqual({ kind: 'wolves', step: 'werewolf', seats: [2] })
    expect(info.get(2)).toEqual({ kind: 'wolves', step: 'werewolf', seats: [0] })
    expect(actionFor(s, 'werewolf', 0)).toBeNull()
  })

  it('혼자인 늑대는 가운데 1장을 본다 (자리 카드는 못 본다)', () => {
    const s = make(['werewolf', 'seer', 'robber'], ['werewolf', 'troublemaker', 'villager'])
    expect(actionFor(s, 'werewolf', 0)).toBe('loneWolf')
    expect(applyAction(s, 0, 'werewolf', 'loneWolf', [1])).toBeNull()
    const r = act(s, 0, 'werewolf', 'loneWolf', [4])
    expect(r.info).toEqual({ kind: 'view', step: 'werewolf', cards: [{ pos: 4, role: 'troublemaker' }] })
    // 두 번은 못 본다
    expect(applyAction(r.state, 0, 'werewolf', 'loneWolf', [5])).toBeNull()
  })

  it('하수인은 늑대를 보고, 늑대는 하수인을 모른다', () => {
    const s = make(['werewolf', 'minion', 'werewolf', 'seer'])
    expect(stepStartInfo(s, 'minion').get(1)).toEqual({ kind: 'wolves', step: 'minion', seats: [0, 2] })
    expect(stepStartInfo(s, 'werewolf').get(0)).toEqual({ kind: 'wolves', step: 'werewolf', seats: [2] })
  })

  it('프리메이슨은 서로 확인한다 (혼자면 빈 목록)', () => {
    const s = make(['mason', 'seer', 'robber'], ['mason', 'villager', 'villager'])
    expect(stepStartInfo(s, 'mason').get(0)).toEqual({ kind: 'masons', step: 'mason', seats: [] })
  })

  it('늑대가 깨지 않는 사람에게는 정보가 없다', () => {
    const s = make(['seer', 'robber', 'villager'], ['werewolf', 'werewolf', 'troublemaker'])
    expect(stepStartInfo(s, 'werewolf').size).toBe(0)
    expect(actorsOf(s, 'werewolf')).toEqual([])
  })
})

describe('예언자·강도·말썽쟁이·주정뱅이·불면증 환자', () => {
  const base = () => make(['seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'werewolf'], ['villager', 'hunter', 'tanner'])

  it('예언자: 남 1장 또는 가운데 2장 (자기·가운데 1장·섞어 고르기는 안 됨)', () => {
    const s = base()
    expect(act(s, 0, 'seer', 'seer', [5]).info).toEqual({ kind: 'view', step: 'seer', cards: [{ pos: 5, role: 'werewolf' }] })
    expect(act(s, 0, 'seer', 'seer', [6, 8]).info).toEqual({
      kind: 'view',
      step: 'seer',
      cards: [{ pos: 6, role: 'villager' }, { pos: 8, role: 'tanner' }],
    })
    expect(applyAction(s, 0, 'seer', 'seer', [0])).toBeNull()
    expect(applyAction(s, 0, 'seer', 'seer', [6])).toBeNull()
    expect(applyAction(s, 0, 'seer', 'seer', [5, 6])).toBeNull()
    expect(applyAction(s, 0, 'seer', 'seer', [6, 6])).toBeNull()
  })

  it('예언자가 아닌 사람은 예언자 행동을 못 한다', () => {
    expect(applyAction(base(), 1, 'seer', 'seer', [5])).toBeNull()
  })

  it('강도: 남과 바꾸고 새 카드를 본다', () => {
    const r = act(base(), 1, 'robber', 'robber', [5])
    expect(r.info).toEqual({ kind: 'view', step: 'robber', cards: [{ pos: 1, role: 'werewolf' }] })
    expect(finalRole(r.state, 1)).toBe('werewolf')
    expect(finalRole(r.state, 5)).toBe('robber')
  })

  it('말썽쟁이: 남 둘을 안 보고 바꾼다 (자기 포함 안 됨)', () => {
    const s = base()
    const r = act(s, 2, 'troublemaker', 'troublemaker', [0, 5])
    expect(r.info).toEqual({ kind: 'swap', step: 'troublemaker', a: 0, b: 5 })
    expect(finalRole(r.state, 0)).toBe('werewolf')
    expect(finalRole(r.state, 5)).toBe('seer')
    expect(applyAction(s, 2, 'troublemaker', 'troublemaker', [2, 5])).toBeNull()
    expect(applyAction(s, 2, 'troublemaker', 'troublemaker', [6, 5])).toBeNull()
  })

  it('주정뱅이: 가운데와 안 보고 바꾼다', () => {
    const r = act(base(), 3, 'drunk', 'drunk', [8])
    expect(r.info).toEqual({ kind: 'swap', step: 'drunk', a: 3, b: 8 })
    expect(finalRole(r.state, 3)).toBe('tanner')
  })

  it('강도 → 말썽쟁이 → 주정뱅이 → 불면증 환자 순서가 이어진다', () => {
    let s = base()
    s = act(s, 1, 'robber', 'robber', [4]).state // 강도 ↔ 불면증 환자
    s = act(s, 2, 'troublemaker', 'troublemaker', [4, 5]).state // 불면증 자리(지금 강도 카드) ↔ 늑대
    s = act(s, 3, 'drunk', 'drunk', [6]).state
    // 불면증 환자는 자기 자리의 지금 카드를 본다: 늑대
    expect(stepStartInfo(s, 'insomniac').get(4)).toEqual({ kind: 'view', step: 'insomniac', cards: [{ pos: 4, role: 'werewolf' }] })
    expect(finalRole(s, 1)).toBe('insomniac')
    expect(finalRole(s, 5)).toBe('robber')
    expect(finalRole(s, 3)).toBe('villager')
    expect(s.log.map((e) => e.action)).toEqual(['robber', 'troublemaker', 'drunk'])
  })
})

describe('도플갱어', () => {
  it('복사한 역할이 된다: 예언자를 복사하면 도플갱어 단계에서 바로 본다', () => {
    let s = make(['doppelganger', 'seer', 'werewolf'], ['villager', 'robber', 'troublemaker'])
    const r = act(s, 0, 'doppelganger', 'copy', [1])
    expect(r.info).toEqual({ kind: 'copy', step: 'doppelganger', target: 1, role: 'seer' })
    s = r.state
    expect(nightRole(s, 0)).toBe('seer')
    expect(actionFor(s, 'doppelganger', 0)).toBe('doppelAct')
    const v = act(s, 0, 'doppelganger', 'doppelAct', [2])
    expect(v.info).toEqual({ kind: 'view', step: 'doppelganger', cards: [{ pos: 2, role: 'werewolf' }] })
    // 예언자 단계에는 진짜 예언자만 깬다
    expect(actorsOf(v.state, 'seer')).toEqual([1])
  })

  it('강도를 복사하면 바로 바꾸고, 카드는 끝까지 복사한 역할로 친다', () => {
    let s = make(['doppelganger', 'robber', 'werewolf'])
    s = act(s, 0, 'doppelganger', 'copy', [1]).state
    const r = act(s, 0, 'doppelganger', 'doppelAct', [2])
    expect(r.info).toEqual({ kind: 'view', step: 'doppelganger', cards: [{ pos: 0, role: 'werewolf' }] })
    // 늑대 자리로 간 도플갱어 카드는 '강도'
    expect(finalRole(r.state, 2)).toBe('robber')
    // 늑대 단계: 바꾸기 전 카드 기준으로 깨므로 원래 늑대(자리 2)가 혼자인 늑대
    expect(actorsOf(r.state, 'werewolf')).toEqual([2])
  })

  it('말썽쟁이·주정뱅이 복사', () => {
    let s = make(['doppelganger', 'troublemaker', 'werewolf', 'seer'])
    s = act(s, 0, 'doppelganger', 'copy', [1]).state
    s = act(s, 0, 'doppelganger', 'doppelAct', [2, 3]).state
    expect(finalRole(s, 2)).toBe('seer')

    let d = make(['doppelganger', 'drunk', 'werewolf'], ['tanner', 'villager', 'villager'])
    d = act(d, 0, 'doppelganger', 'copy', [1]).state
    d = act(d, 0, 'doppelganger', 'doppelAct', [3]).state
    expect(finalRole(d, 0)).toBe('tanner')
    // 가운데로 간 도플갱어 카드는 주정뱅이로 친다
    expect(d.cards[3].copied).toBe('drunk')
  })

  it('늑대인간을 복사하면 늑대와 함께 깨고 늑대 팀이 된다', () => {
    let s = make(['doppelganger', 'werewolf', 'minion', 'seer'])
    s = act(s, 0, 'doppelganger', 'copy', [1]).state
    expect(actionFor(s, 'doppelganger', 0)).toBeNull()
    const info = stepStartInfo(s, 'werewolf')
    expect(info.get(0)).toEqual({ kind: 'wolves', step: 'werewolf', seats: [1] })
    expect(info.get(1)).toEqual({ kind: 'wolves', step: 'werewolf', seats: [0] })
    expect(stepStartInfo(s, 'minion').get(2)).toEqual({ kind: 'wolves', step: 'minion', seats: [0, 1] })
    expect(finalRole(s, 0)).toBe('werewolf')
  })

  it('하수인·프리메이슨 복사', () => {
    let s = make(['doppelganger', 'minion', 'werewolf', 'mason'], ['mason', 'villager', 'villager'])
    s = act(s, 0, 'doppelganger', 'copy', [1]).state
    expect(stepStartInfo(s, 'minion').get(0)).toEqual({ kind: 'wolves', step: 'minion', seats: [2] })

    let m = make(['doppelganger', 'mason', 'mason', 'werewolf'])
    m = act(m, 0, 'doppelganger', 'copy', [2]).state
    expect(stepStartInfo(m, 'mason').get(1)).toEqual({ kind: 'masons', step: 'mason', seats: [0, 2] })
  })

  it('불면증 환자를 복사하면 맨 끝 단계에 자기 카드를 본다', () => {
    let s = make(['doppelganger', 'insomniac', 'robber', 'werewolf'])
    s = act(s, 0, 'doppelganger', 'copy', [1]).state
    expect(actorsOf(s, 'insomniac')).toEqual([1])
    s = act(s, 2, 'robber', 'robber', [0]).state
    expect(stepStartInfo(s, 'doppelInsomniac').get(0)).toEqual({
      kind: 'view',
      step: 'doppelInsomniac',
      cards: [{ pos: 0, role: 'robber' }],
    })
  })

  it('자기 자신이나 가운데는 복사할 수 없다', () => {
    const s = make(['doppelganger', 'seer', 'werewolf'])
    expect(applyAction(s, 0, 'doppelganger', 'copy', [0])).toBeNull()
    expect(applyAction(s, 0, 'doppelganger', 'copy', [3])).toBeNull()
  })

  it('무두장이를 복사하면 무두장이로 이긴다', () => {
    let s = make(['doppelganger', 'tanner', 'werewolf', 'seer'])
    s = act(s, 0, 'doppelganger', 'copy', [1]).state
    const o = outcome(s, resolveVotes(s, { 1: 0, 2: 0, 3: 0, 0: 1 }))
    expect(o.deaths).toEqual([0])
    expect(o.won[0]).toBe(true)
    expect(o.won[1]).toBe(false)
    expect(o.werewolfWins).toBe(false)
  })
})

describe('투표', () => {
  const s = make(['werewolf', 'seer', 'robber', 'villager', 'hunter'])

  it('가장 많이 받은 사람이 죽는다', () => {
    expect(resolveVotes(s, { 0: 1, 1: 0, 2: 0, 3: 0, 4: 2 })).toEqual([0])
  })

  it('동점이면 모두 죽는다', () => {
    expect(resolveVotes(s, { 0: 1, 1: 0, 2: 0, 3: 1, 4: 2 })).toEqual([0, 1])
  })

  it('아무도 2표 이상 못 받으면 아무도 안 죽는다', () => {
    expect(resolveVotes(s, { 0: 1, 1: 2, 2: 3, 3: 4, 4: 0 })).toEqual([])
  })

  it('자기 자신에게 한 표는 세지 않는다', () => {
    expect(resolveVotes(s, { 0: 0, 1: 0, 2: 1, 3: 4, 4: 3 })).toEqual([])
  })

  it('사냥꾼이 죽으면 사냥꾼이 지목한 사람도 죽는다', () => {
    expect(resolveVotes(s, { 0: 4, 1: 4, 2: 4, 3: 1, 4: 0 })).toEqual([0, 4])
  })

  it('사냥꾼 판정은 마지막 카드 기준이다', () => {
    let t = make(['werewolf', 'seer', 'robber', 'villager', 'hunter'])
    t = act(t, 2, 'robber', 'robber', [4]).state // 강도가 사냥꾼이 됨
    expect(resolveVotes(t, { 0: 2, 1: 2, 3: 2, 2: 0, 4: 1 })).toEqual([0, 2])
    expect(resolveVotes(t, { 0: 4, 1: 4, 3: 4, 2: 1, 4: 0 })).toEqual([4])
  })
})

describe('승패', () => {
  it('늑대가 죽으면 마을이 이긴다', () => {
    const s = make(['werewolf', 'seer', 'robber', 'minion'])
    const o = outcome(s, [0])
    expect(o.villageWins).toBe(true)
    expect(o.werewolfWins).toBe(false)
    expect(o.won).toEqual([false, true, true, false])
  })

  it('늑대가 안 죽으면 늑대 팀(하수인 포함)이 이긴다, 하수인이 죽어도', () => {
    const s = make(['werewolf', 'seer', 'robber', 'minion'])
    const o = outcome(s, [3])
    expect(o.werewolfWins).toBe(true)
    expect(o.won).toEqual([true, false, false, true])
  })

  it('무두장이가 죽으면 무두장이가 이기고 늑대 팀은 진다', () => {
    const s = make(['werewolf', 'seer', 'tanner'])
    const o = outcome(s, [2])
    expect(o.won).toEqual([false, false, true])
    expect(o.villageWins).toBe(false)
  })

  it('늑대와 무두장이가 같이 죽으면 마을과 무두장이가 이긴다', () => {
    const s = make(['werewolf', 'seer', 'tanner'])
    expect(outcome(s, [0, 2]).won).toEqual([false, true, true])
  })

  it('플레이어 중 늑대가 없으면 아무도 안 죽어야 마을 승', () => {
    const s = make(['seer', 'robber', 'villager'], ['werewolf', 'werewolf', 'troublemaker'])
    expect(outcome(s, []).won).toEqual([true, true, true])
    expect(outcome(s, [1]).won).toEqual([false, false, false])
  })

  it('늑대가 없으면 하수인은 자기 말고 누군가 죽으면 이긴다', () => {
    const s = make(['minion', 'seer', 'villager'], ['werewolf', 'werewolf', 'robber'])
    expect(outcome(s, [1]).won).toEqual([true, false, false])
    expect(outcome(s, [0]).won).toEqual([false, false, false])
    expect(outcome(s, []).won).toEqual([false, true, true])
  })

  it('밤에 카드가 바뀌면 바뀐 카드 기준으로 이긴다', () => {
    let s = make(['werewolf', 'robber', 'seer'])
    s = act(s, 1, 'robber', 'robber', [0]).state // 강도가 늑대가 되고 원래 늑대는 강도(마을)
    const o = outcome(s, [0])
    expect(o.villageWins).toBe(false)
    expect(o.won).toEqual([false, true, false])
  })
})
