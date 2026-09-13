import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'

export const OWNER_EMAIL = 'kwat09k@gmail.com'

export function createTestEnv() {
  return initializeTestEnvironment({
    projectId: 'demo-doyou-boardgame',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
}

export const ownerAuth = { email: OWNER_EMAIL, email_verified: true }

export function newUserData(overrides: Record<string, unknown> = {}) {
  return {
    nickname: '보드러버',
    googleName: '홍길동',
    photoURL: null,
    role: 'member',
    status: 'pending',
    referrerName: '김철수',
    referrerId: null,
    createdAt: serverTimestamp(),
    approvedAt: null,
    lastActiveAt: serverTimestamp(),
    ...overrides,
  }
}

/** 규칙을 끄고 임의 문서를 미리 넣는다 */
export async function seedDoc(env: RulesTestEnvironment, path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data)
  })
}

/** 규칙을 끄고 users 문서를 미리 넣는다 */
export async function seedUser(
  env: RulesTestEnvironment,
  uid: string,
  overrides: Record<string, unknown> = {},
) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const now = Timestamp.now()
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      ...newUserData(),
      createdAt: now,
      lastActiveAt: now,
      ...overrides,
    })
  })
}
