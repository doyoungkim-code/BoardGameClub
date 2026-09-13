import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { isOwnerAccount } from '@/services/auth'
import type { UserPrivate, UserProfile, UserStatus } from '@/types/user'

export const usersCol = collection(db, 'users')

export const userRef = (uid: string) => doc(db, 'users', uid)

const userPrivateRef = (uid: string) => doc(db, 'userPrivate', uid)

export function toProfile(snap: DocumentSnapshot): UserProfile {
  return { uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) }
}

/** 가입 신청. 오너 계정이면 바로 승인된 오너로 생성된다. */
export async function createProfile(user: User, input: { nickname: string; referrerName: string }) {
  const owner = isOwnerAccount(user)
  const batch = writeBatch(db)
  batch.set(userRef(user.uid), {
    nickname: input.nickname,
    googleName: user.displayName ?? '',
    photoURL: user.photoURL ?? null,
    role: owner ? 'owner' : 'member',
    status: owner ? 'approved' : 'pending',
    referrerName: input.referrerName,
    referrerId: null,
    createdAt: serverTimestamp(),
    approvedAt: owner ? serverTimestamp() : null,
    lastActiveAt: serverTimestamp(),
  })
  batch.set(userPrivateRef(user.uid), { email: user.email ?? '' })
  await batch.commit()
}

export function updateNickname(uid: string, nickname: string) {
  return updateDoc(userRef(uid), { nickname })
}

export function touchLastActive(uid: string) {
  return updateDoc(userRef(uid), { lastActiveAt: serverTimestamp() })
}

export async function getUserPrivate(uid: string) {
  const snap = await getDoc(userPrivateRef(uid))
  return snap.exists() ? (snap.data() as UserPrivate) : null
}

// ---------- 오너 전용 ----------

export function approveUser(uid: string, referrerId: string | null) {
  return updateDoc(userRef(uid), { status: 'approved', approvedAt: serverTimestamp(), referrerId })
}

export function setUserStatus(uid: string, status: Exclude<UserStatus, 'approved'>) {
  return updateDoc(userRef(uid), { status })
}

export function updateReferrer(uid: string, referrerId: string | null) {
  return updateDoc(userRef(uid), { referrerId })
}
