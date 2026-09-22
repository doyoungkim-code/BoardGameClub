import { format, formatDistanceToNowStrict, isSameDay, isSameYear } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FirebaseError } from 'firebase/app'
import type { Timestamp } from 'firebase/firestore'
import { FOUNDER_REFERRER, type UserProfile } from '@/types/user'

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

/** 모임 목록용: 9월 20일 (토) 오후 2:00 */
export function formatEventDate(ts: Timestamp) {
  return format(ts.toDate(), 'M월 d일 (E) a h:mm', { locale: ko })
}

/** 모임 상세용: 2026년 9월 20일 토요일 오후 2:00 ~ 오후 6:00 */
export function formatEventRange(startAt: Timestamp, endAt: Timestamp | null) {
  const start = format(startAt.toDate(), 'yyyy년 M월 d일 EEEE a h:mm', { locale: ko })
  if (!endAt) return start
  const end = endAt.toDate()
  // 같은 날이면 시각만, 날짜를 넘기면 날짜까지 다시 쓴다
  const endText = isSameDay(startAt.toDate(), end)
    ? format(end, 'a h:mm', { locale: ko })
    : format(end, 'M월 d일 a h:mm', { locale: ko })
  return `${start} ~ ${endText}`
}

/** 날짜별로 묶을 때 쓰는 키 */
export const dayKey = (date: Date) => format(date, 'yyyy-MM-dd')

/** <input type="datetime-local"> 에 넣을 값 (로컬 시간 기준) */
export function toDateTimeLocal(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

/** "OO의 지인". 연결된 회원이 있으면 그 회원의 현재 닉네임, 없으면 가입 때 입력한 이름 */
export function referrerLabel(profile: UserProfile, byId: Record<string, UserProfile>) {
  if (profile.referrerId === FOUNDER_REFERRER) return '초기 멤버'
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
