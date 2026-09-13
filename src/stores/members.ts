import { onSnapshot, query, where } from 'firebase/firestore'
import { create } from 'zustand'
import { toProfile, usersCol } from '@/services/users'
import type { UserProfile } from '@/types/user'

type MembersState = {
  loaded: boolean
  /** 승인된 회원 (닉네임 가나다순) */
  members: UserProfile[]
  byId: Record<string, UserProfile>
}

export const useMembers = create<MembersState>(() => ({ loaded: false, members: [], byId: {} }))

let unsubscribe: (() => void) | null = null
let subscribers = 0

/**
 * 승인된 회원 목록을 실시간 구독한다. 동호회 규모가 작아서 한 번에 모두 받아
 * 닉네임·소개자 표시 등에 공통으로 쓴다. 반환값을 호출하면 구독 해제.
 */
export function startMembersSync() {
  subscribers += 1
  if (!unsubscribe) {
    unsubscribe = onSnapshot(
      query(usersCol, where('status', '==', 'approved')),
      (snap) => {
        const members = snap.docs.map(toProfile).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))
        useMembers.setState({
          loaded: true,
          members,
          byId: Object.fromEntries(members.map((m) => [m.uid, m])),
        })
      },
      (error) => console.error('회원 목록 구독 실패', error),
    )
  }
  return () => {
    subscribers -= 1
    if (subscribers <= 0) stopMembersSync()
  }
}

export function stopMembersSync() {
  unsubscribe?.()
  unsubscribe = null
  subscribers = 0
  useMembers.setState({ loaded: false, members: [], byId: {} })
}
