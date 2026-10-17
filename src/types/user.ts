import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'owner' | 'member'

/** 소개자 자리에 넣는 '초기 멤버' 표시값. 회원 uid(28자)와 겹치지 않는다 */
export const FOUNDER_REFERRER = 'founder'

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'removed'

/** users/{uid} — 승인된 회원이면 누구나 읽을 수 있는 공개 프로필 */
export type UserProfile = {
  uid: string
  nickname: string
  googleName: string
  photoURL: string | null
  role: UserRole
  status: UserStatus
  /** 가입 신청 때 본인이 입력한 소개자 이름 */
  referrerName: string
  /** 오너가 승인할 때 연결한 소개 회원 uid, 또는 소개자 없이 처음부터 있던 회원이면 FOUNDER_REFERRER */
  referrerId: string | null
  createdAt: Timestamp | null
  approvedAt: Timestamp | null
  lastActiveAt: Timestamp | null
  /** 대표 칭호 ('auto:<id>' 또는 'granted:<이름>'). 본인만 바꾼다. 예전 문서엔 없다 */
  titleId?: string | null
  /** 오너가 준 칭호 목록 ('granted:<이름>'). 오너만 바꾼다. 예전 문서엔 없다 */
  grantedTitles?: string[]
  /** 주사위로 얻은 경험치 합 (src/data/dice.ts). 없으면 0 */
  diceXp?: number
  /** 주사위로 얻은 코인 (상점에서 쓴다). 없으면 0 */
  coins?: number
  /** 마지막으로 보상을 받은 굴림 문서 id (규칙이 굴림과 짝을 맞추는 데 쓴다) */
  lastRollId?: string
  /** 상점에서 산 아이템 id (src/data/shopItems.ts) */
  items?: string[]
  /** 규칙이 '방금 산 것'을 알아보는 데 쓴다 */
  lastPurchase?: string
  /** 배너에 단 배경 무늬·도트 소품 (없으면 null) */
  bannerBackground?: string | null
  bannerProp?: string | null
}

/** userPrivate/{uid} — 본인과 오너만 읽을 수 있는 정보 */
export type UserPrivate = {
  email: string
}
