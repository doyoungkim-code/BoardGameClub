import { onAuthStateChanged, type User } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'
import { create } from 'zustand'
import { auth } from '@/lib/firebase'
import { toProfile, touchLastActive, userRef } from '@/services/users'
import { stopChatSync } from '@/stores/chat'
import { stopMembersSync } from '@/stores/members'
import type { UserProfile } from '@/types/user'

type AuthState = {
  /** 로그인 여부와 users 문서 존재 여부를 모두 확인했는지 */
  initialized: boolean
  user: User | null
  /** null 이면 아직 가입 신청 전 */
  profile: UserProfile | null
}

export const useAuth = create<AuthState>(() => ({
  initialized: false,
  user: null,
  profile: null,
}))

export const useIsOwner = () => useAuth((s) => s.profile?.role === 'owner')

let unsubscribeProfile: (() => void) | null = null

/** 앱 시작 시 한 번 호출. 로그인 상태와 본인 users 문서를 실시간으로 따라간다. */
export function initAuthListener() {
  onAuthStateChanged(auth, (user) => {
    unsubscribeProfile?.()
    unsubscribeProfile = null

    if (!user) {
      stopMembersSync()
      stopChatSync()
      useAuth.setState({ initialized: true, user: null, profile: null })
      return
    }

    useAuth.setState({ initialized: false, user, profile: null })
    unsubscribeProfile = onSnapshot(
      userRef(user.uid),
      { includeMetadataChanges: true },
      (snap) => {
        // 오프라인 캐시에 없을 뿐 서버에는 있을 수 있으니 서버 응답을 기다린다
        if (!snap.exists() && snap.metadata.fromCache) return
        const profile = snap.exists() ? toProfile(snap) : null
        useAuth.setState({ initialized: true, profile })
        if (profile?.status === 'approved') touchLastActiveOncePerSession(user.uid)
      },
      (error) => {
        console.error('프로필 구독 실패', error)
        useAuth.setState({ initialized: true, profile: null })
      },
    )
  })
}

// 무료 한도 절약: 최근 활동일은 브라우저 세션당 한 번만 기록
function touchLastActiveOncePerSession(uid: string) {
  const key = `lastActiveTouched:${uid}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // sessionStorage를 쓸 수 없는 환경이면 그냥 기록
  }
  touchLastActive(uid).catch((error) => console.warn('최근 활동일 기록 실패', error))
}
