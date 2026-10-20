import type { Sprite } from '@/pixel/draw'
import type { RoleId } from '@/games/wolf/roles'

/**
 * 「한밤의 늑대」 역할 카드 그림: 64×64 SD 도트 PNG (public/wolf/cards).
 * 원작 카드와 오너가 만든 캐릭터 디자인을 참고해 새로 그렸다. 화면에서는 image-rendering: pixelated 로 키운다.
 * 카드 테두리 색(팀 색)은 화면에서 입힌다.
 */
export const ROLE_CARD: Record<RoleId, string> = {
  doppelganger: '/wolf/cards/doppelganger.png',
  werewolf: '/wolf/cards/werewolf.png',
  minion: '/wolf/cards/minion.png',
  mason: '/wolf/cards/mason.png',
  seer: '/wolf/cards/seer.png',
  robber: '/wolf/cards/robber.png',
  troublemaker: '/wolf/cards/troublemaker.png',
  drunk: '/wolf/cards/drunk.png',
  insomniac: '/wolf/cards/insomniac.png',
  villager: '/wolf/cards/villager.png',
  hunter: '/wolf/cards/hunter.png',
  tanner: '/wolf/cards/tanner.png',
}

/** 색 글자: # 외곽선, B 밤하늘, y 노랑 */
const COLORS: Record<string, string> = {
  '#': '#2a1d14',
  B: '#1c2656',
  y: '#facc15',
}

const art = (...rows: string[]): Sprite => ({ rows, colors: COLORS })

/** 카드 뒷면: 밤하늘에 초승달과 별 */
export const CARD_BACK: Sprite = art(
  '################',
  '#BBBBBBBBBBBBBB#',
  '#BByBBBBBBBByBB#',
  '#BBBBBByyyBBBBB#',
  '#BBBBByyyyyBBBB#',
  '#BBBByyBBBBBBBB#',
  '#BBBByyBBBBBBBB#',
  '#BBBByyBBBBBBBB#',
  '#BBBBByyyyyBBBB#',
  '#BBBBBByyyBBBBB#',
  '#BBBBBBBBBBBBBB#',
  '#BBBBBBBBBByBBB#',
  '#ByBBBBBBBBBBBB#',
  '#BBBBBBBBBBBBBB#',
  '#BBBBBBBBBBBBBB#',
  '################',
)

/** 팀 색 (카드 테두리·바탕): 늑대 팀 붉은 계열, 마을 팀 푸른 계열, 무두장이·도플갱어는 따로 */
export const TEAM_COLOR = {
  werewolf: '#b33a3a',
  village: '#3b6fd6',
  tanner: '#8a5a34',
  copy: '#7b4fb0',
} as const
