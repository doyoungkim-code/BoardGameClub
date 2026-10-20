/**
 * 「한밤의 늑대」 역할 (원작: 한밤의 늑대인간 기본판). 게임 계산(engine.ts)과 화면이 같이 쓴다.
 * 역할 이름은 회원들에게 익숙한 이름 그대로 쓴다.
 */

export type RoleId =
  | 'doppelganger'
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  | 'villager'
  | 'hunter'
  | 'tanner'

/** werewolf: 늑대 팀(늑대인간·하수인), village: 마을 팀, tanner: 혼자(죽어야 이김), copy: 도플갱어(복사한 역할의 팀) */
export type Team = 'werewolf' | 'village' | 'tanner' | 'copy'

export type RoleInfo = {
  id: RoleId
  name: string
  team: Team
  /** 한 줄 설명 (카드 아래·대기실) */
  ability: string
  /** 한 판에 넣을 수 있는 수 */
  max: number
}

export const ROLES: Record<RoleId, RoleInfo> = {
  doppelganger: { id: 'doppelganger', name: '도플갱어', team: 'copy', max: 1, ability: '남의 카드를 보고 그 역할이 된다' },
  werewolf: { id: 'werewolf', name: '늑대인간', team: 'werewolf', max: 2, ability: '늑대끼리 확인. 혼자면 가운데 1장 보기' },
  minion: { id: 'minion', name: '하수인', team: 'werewolf', max: 1, ability: '늑대가 누군지 본다 (늑대는 모름)' },
  mason: { id: 'mason', name: '프리메이슨', team: 'village', max: 2, ability: '프리메이슨끼리 확인' },
  seer: { id: 'seer', name: '예언자', team: 'village', max: 1, ability: '남 1장 또는 가운데 2장 보기' },
  robber: { id: 'robber', name: '강도', team: 'village', max: 1, ability: '남과 카드를 바꾸고 새 카드 보기' },
  troublemaker: { id: 'troublemaker', name: '말썽쟁이', team: 'village', max: 1, ability: '남 둘의 카드를 몰래 바꾼다' },
  drunk: { id: 'drunk', name: '주정뱅이', team: 'village', max: 1, ability: '내 카드를 가운데와 안 보고 바꾼다' },
  insomniac: { id: 'insomniac', name: '불면증 환자', team: 'village', max: 1, ability: '마지막에 내 카드를 다시 본다' },
  villager: { id: 'villager', name: '마을 주민', team: 'village', max: 3, ability: '능력 없음' },
  hunter: { id: 'hunter', name: '사냥꾼', team: 'village', max: 1, ability: '죽으면 내가 지목한 사람도 죽는다' },
  tanner: { id: 'tanner', name: '무두장이', team: 'tanner', max: 1, ability: '내가 죽으면 이긴다' },
}

/** 화면에 늘어놓는 순서 (밤 순서 + 밤에 안 깨는 역할) */
export const ROLE_ORDER: RoleId[] = [
  'doppelganger',
  'werewolf',
  'minion',
  'mason',
  'seer',
  'robber',
  'troublemaker',
  'drunk',
  'insomniac',
  'villager',
  'hunter',
  'tanner',
]
