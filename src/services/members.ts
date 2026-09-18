import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserProfile } from '@/types/user'

// 활동 기록·업적 계산은 services/activity.ts

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
