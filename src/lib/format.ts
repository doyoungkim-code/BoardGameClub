import { format, formatDistanceToNowStrict, isSameDay, isSameYear } from 'date-fns'
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

/** 채팅 목록용: 오늘이면 시각, 올해면 월·일, 그 전이면 연도까지 */
export function formatChatListTime(ts: Timestamp | null | undefined) {
  if (!ts) return ''
  const date = ts.toDate()
  const now = new Date()
  if (isSameDay(date, now)) return format(date, 'a h:mm', { locale: ko })
  if (isSameYear(date, now)) return format(date, 'M월 d일', { locale: ko })
  return format(date, 'yyyy. M. d.', { locale: ko })
}

/** 말풍선 옆 시각: 오후 3:05 */
export function formatMessageTime(ms: number) {
  return format(ms, 'a h:mm', { locale: ko })
}

/** 날짜 구분선: 2026년 9월 13일 일요일 */
export function formatDateDivider(ms: number) {
  return format(ms, 'yyyy년 M월 d일 EEEE', { locale: ko })
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
