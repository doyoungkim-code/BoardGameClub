import { CENTER_COUNT, type Info, type NightEvent } from '@/games/wolf/engine'
import { ROLES, type RoleId } from '@/games/wolf/roles'
import { STEP_LABEL } from '@/games/wolf/timeline'
import type { UserProfile } from '@/types/user'

/** 게임 안에서는 실명 (관리자가 등록, 없으면 닉네임) */
export const wolfName = (member: UserProfile | undefined) => member?.realName || member?.nickname || '알 수 없음'

export const roleName = (role: RoleId) => ROLES[role].name

/** 받침에 따라 이/가, 을/를, 와/과 */
function josa(word: string, withFinal: string, withoutFinal: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0
  return word + (hasFinal ? withFinal : withoutFinal)
}
export const iGa = (w: string) => josa(w, '이', '가')
export const eulReul = (w: string) => josa(w, '을', '를')
export const waGwa = (w: string) => josa(w, '과', '와')

/** 자리 이름: 플레이어는 이름, 가운데는 "가운데 N번" */
export function positionName(pos: number, playerNames: string[]) {
  const n = playerNames.length
  if (pos >= n && pos < n + CENTER_COUNT) return `가운데 ${pos - n + 1}번`
  return playerNames[pos] ?? '?'
}

/** 밤에 알게 된 것 → 한 줄 (내 화면용) */
export function infoText(info: Info, playerNames: string[], mySeat: number): string {
  const name = (p: number) => (p === mySeat ? '나' : positionName(p, playerNames))
  const names = (ps: number[]) => ps.map(name).join(', ')
  switch (info.kind) {
    case 'copy':
      return `${name(info.target)}의 카드는 ${roleName(info.role)}. 나는 이제 ${iGa(roleName(info.role))}에요`
    case 'wolves':
      if (info.step === 'minion') return info.seats.length ? `늑대인간: ${names(info.seats)}` : '늑대인간이 아무도 없어요 (모두 가운데)'
      return info.seats.length ? `늑대 동료: ${names(info.seats)}` : '늑대는 나 혼자예요. 가운데 카드 1장을 볼 수 있어요'
    case 'masons':
      return info.seats.length ? `다른 프리메이슨: ${names(info.seats)}` : '다른 프리메이슨은 가운데에 있어요'
    case 'view': {
      const [first] = info.cards
      // 불면증 환자: 지금 내 카드, 강도(도플갱어-강도 포함): 바꾼 뒤 내 새 카드
      if (info.step === 'insomniac' || info.step === 'doppelInsomniac') return `지금 내 카드: ${roleName(first.role)}`
      if (first.pos === mySeat) return `바꾼 뒤 내 새 카드: ${roleName(first.role)}`
      return info.cards.map((c) => `${name(c.pos)}: ${roleName(c.role)}`).join(' · ')
    }
    case 'swap':
      if (info.a === mySeat) return `내 카드를 ${positionName(info.b, playerNames)} 카드와 바꿨어요 (새 카드는 못 봐요)`
      return `${waGwa(name(info.a))} ${name(info.b)}의 카드를 바꿨어요`
  }
}

/** 결과 화면의 밤 기록 한 줄 */
export function eventText(e: NightEvent, playerNames: string[]): string {
  const who = `${playerNames[e.seat]}(${roleName(e.role)})`
  const t = (p: number) => positionName(p, playerNames)
  const ts = e.targets.map(t).join(', ')
  switch (e.action) {
    case 'look':
      if (e.step === 'insomniac' || e.step === 'doppelInsomniac') return `${who} 자기 카드를 다시 봤어요`
      if (e.step === 'mason') return e.targets.length ? `${who} 다른 프리메이슨 ${eulReul(ts)} 확인했어요` : `${who} 혼자였어요`
      if (e.step === 'minion') return e.targets.length ? `${who} 늑대인간 ${eulReul(ts)} 확인했어요` : `${who} 늑대인간이 없는 걸 확인했어요`
      return e.targets.length ? `${who} 늑대 동료 ${eulReul(ts)} 확인했어요` : `${who} 혼자인 늑대였어요`
    case 'copy':
      return `${who} ${t(e.targets[0])}의 카드를 복사했어요`
    case 'loneWolf':
      return `${who} ${t(e.targets[0])} 카드를 봤어요`
    case 'seer':
      return `${who} ${ts} 카드를 봤어요`
    case 'robber':
      return `${who} ${waGwa(t(e.targets[0]))} 카드를 바꿨어요`
    case 'troublemaker':
      return `${who} ${ts}의 카드를 바꿨어요`
    case 'drunk':
      return `${who} 자기 카드를 ${t(e.targets[0])} 카드와 바꿨어요`
    case 'doppelAct':
      // 도플갱어가 복사한 역할(e.role)의 행동으로 쓴다
      return eventText({ ...e, action: e.role as NightEvent['action'] }, playerNames)
  }
}

/** 단계 안내 문구 */
export const stepCall = (step: keyof typeof STEP_LABEL) => `${iGa(STEP_LABEL[step])} 눈을 뜹니다`
