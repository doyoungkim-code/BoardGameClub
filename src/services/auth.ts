import { FirebaseError } from 'firebase/app'
import { signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { OWNER_EMAIL } from '@/lib/constants'

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider)
  } catch (error) {
    const code = error instanceof FirebaseError ? error.code : ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    // 인앱 브라우저 등 팝업이 막히는 환경에서는 리디렉트 방식으로 전환
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-environment') {
      await signInWithRedirect(auth, googleProvider)
      return
    }
    throw error
  }
}

export function signOutUser() {
  return signOut(auth)
}

/** firestore.rules 의 isOwner() 와 같은 조건 */
export function isOwnerAccount(user: User) {
  return user.email === OWNER_EMAIL && user.emailVerified
}
