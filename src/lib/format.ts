import { format, formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FirebaseError } from 'firebase/app'
import type { Timestamp } from 'firebase/firestore'
import type { UserProfile } from '@/types/user'

export function formatDateTime(ts: Timestamp | null | undefined) {
  return ts ? format(ts.toDate(), 'yyyy. M. d. HH:mm', { locale: ko }) : ''
}

export function formatRelative(ts: Timestamp | null | undefined) {
  return ts ? formatDistanceToNowStrict(ts.toDate(), { locale: ko, addSuffix: true }) : ''
}

/** "OO의 지인". 연결된 회원이 있으면 그 회원의 현재 닉네임, 없으면 가입 때 입력한 이름 */
export function referrerLabel(profile: UserProfile, byId: Record<string, UserProfile>) {
  const name = (profile.referrerId && byId[profile.referrerId]?.nickname) || profile.referrerName
  return name ? `${name}의 지인` : null
}

export function toErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') return '권한이 없어요'
    if (error.code === 'unavailable') return '네트워크 연결을 확인해 주세요'
  }
  return '문제가 생겼어요. 잠시 후 다시 시도해 주세요'
}
