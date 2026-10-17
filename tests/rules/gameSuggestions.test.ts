import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { createTestEnv, ownerAuth, seedDoc, seedUser } from './helpers.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})

afterAll(async () => {
  await env.cleanup()
})

const dbAs = (uid: string, token: Record<string, unknown> = { email: `${uid}@example.com`, email_verified: true }) =>
  env.authenticatedContext(uid, token).firestore()
const ownerDb = () => dbAs('owner', ownerAuth)

/** 앱이 보내는 새 추천 (services/gameSuggestions.ts 와 같은 모양) */
const newSuggestion = (uid: string, overrides: Record<string, unknown> = {}) => ({
  name: '윙스팬',
  players: '1~5명',
  note: '새 그림이 예뻐요',
  createdBy: uid,
  createdAt: serverTimestamp(),
  status: 'open',
  ...overrides,
})

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
  await seedDoc(env, 'gameSuggestions/s1', { ...newSuggestion('alice'), createdAt: Timestamp.now() })
})

describe('게임 추천 메모', () => {
  it('회원은 읽고 추천을 남길 수 있다', async () => {
    await assertSucceeds(getDocs(collection(dbAs('bob'), 'gameSuggestions')))
    await assertSucceeds(setDoc(doc(dbAs('bob'), 'gameSuggestions/s2'), newSuggestion('bob')))
  })

  it('대기자는 읽거나 쓸 수 없다', async () => {
    await assertFails(getDocs(collection(dbAs('waiting'), 'gameSuggestions')))
    await assertFails(setDoc(doc(dbAs('waiting'), 'gameSuggestions/s2'), newSuggestion('waiting')))
  })

  it('남의 이름으로 쓰거나 처음부터 넣었음으로 쓸 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('bob'), 'gameSuggestions/s2'), newSuggestion('alice')))
    await assertFails(setDoc(doc(dbAs('bob'), 'gameSuggestions/s3'), newSuggestion('bob', { status: 'added' })))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(dbAs('bob'), `gameSuggestions/${Math.random()}`), newSuggestion('bob', overrides)))
    await bad({ name: '' })
    await bad({ name: 'a'.repeat(51) })
    await bad({ note: 'a'.repeat(301) })
    await bad({ players: 'a'.repeat(21) })
    await bad({ createdAt: Timestamp.fromMillis(0) })
    await bad({ extra: true })
  })

  it('넣었음 표시는 오너만 할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'gameSuggestions/s1'), { status: 'added' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'gameSuggestions/s1'), { status: 'added' }))
    await assertFails(updateDoc(doc(ownerDb(), 'gameSuggestions/s1'), { name: '다른 게임' }))
  })

  it('쓴 사람과 오너만 지울 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('bob'), 'gameSuggestions/s1')))
    await assertSucceeds(deleteDoc(doc(dbAs('alice'), 'gameSuggestions/s1')))
    await seedDoc(env, 'gameSuggestions/s9', { ...newSuggestion('bob'), createdAt: Timestamp.now() })
    await assertSucceeds(deleteDoc(doc(ownerDb(), 'gameSuggestions/s9')))
  })
})
