import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'owner' | 'member'

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
  /** 오너가 승인할 때 연결한 소개 회원 uid */
  referrerId: string | null
  createdAt: Timestamp | null
  approvedAt: Timestamp | null
  lastActiveAt: Timestamp | null
}

/** userPrivate/{uid} — 본인과 오너만 읽을 수 있는 정보 */
export type UserPrivate = {
  email: string
}
