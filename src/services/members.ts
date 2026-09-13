import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ClubEvent } from '@/types/event'
import type { UserProfile } from '@/types/user'

// ---------- 활동 통계 ----------

export type MemberActivity = {
  /** 참석 신청한 모임 수 (취소된 모임 제외) */
  joined: number
  /** 출석 체크된 모임 수 */
  attended: number
}

/**
 * 모임 목록에서 한 회원의 참석·출석 횟수를 센다.
 * 출석 체크를 하지 않은 모임은 참석 신청을 출석으로 본다.
 */
export function countActivity(events: ClubEvent[], uid: string): MemberActivity {
  let joined = 0
  let attended = 0
  for (const event of events) {
    if (event.canceled || !event.attendeeIds.includes(uid)) continue
    joined += 1
    if (event.attendedIds.length === 0 || event.attendedIds.includes(uid)) attended += 1
  }
  return { joined, attended }
}

/** 이 회원이 소개해서 들어온 회원들 */
export const introducedBy = (members: UserProfile[], uid: string) =>
  members.filter((member) => member.referrerId === uid)

/** 마지막 활동일로부터 지난 날 수. 기록이 없으면 null */
export function daysSinceActive(profile: UserProfile) {
  const last = profile.lastActiveAt?.toMillis()
  if (!last) return null
  return Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000))
}

// ---------- 관리자 메모 (오너 전용) ----------

const memoRef = (uid: string) => doc(db, 'adminMemos', uid)

export async function fetchAdminMemo(uid: string) {
  const snap = await getDoc(memoRef(uid))
  return snap.exists() ? ((snap.data().memo as string) ?? '') : ''
}

export function saveAdminMemo(uid: string, memo: string) {
  return setDoc(memoRef(uid), { memo, updatedAt: serverTimestamp() })
}
