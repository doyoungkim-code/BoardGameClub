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

const newPlace = (createdBy: string, overrides: Record<string, unknown> = {}) => ({
  name: '레드버튼 강남점',
  address: '서울 강남구 강남대로 1',
  memo: '',
  lat: 37.4979,
  lng: 127.0276,
  createdBy,
  createdAt: serverTimestamp(),
  ...overrides,
})

const seedPlace = (id: string, createdBy: string) =>
  seedDoc(env, `places/${id}`, { ...newPlace(createdBy), createdAt: Timestamp.now() })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('장소 읽기·등록', () => {
  it('승인된 회원은 읽을 수 있고 대기자는 못 읽는다', async () => {
    await seedPlace('p1', 'alice')
    await assertSucceeds(getDocs(collection(dbAs('bob'), 'places')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'places')))
  })

  it('회원 누구나 등록할 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'places/p1'), newPlace('alice')))
  })

  it('대기자는 등록할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('waiting'), 'places/p1'), newPlace('waiting')))
  })

  it('다른 사람 이름으로 등록할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'places/p1'), newPlace('bob')))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(dbAs('alice'), `places/${Math.random()}`), newPlace('alice', overrides)))
    await bad({ name: '' })
    await bad({ name: 'a'.repeat(41) })
    await bad({ lat: 91 })
    await bad({ lng: -181 })
    await bad({ lat: '37.5' })
    await bad({ memo: 'a'.repeat(301) })
    await bad({ createdAt: Timestamp.fromMillis(0) })
    await bad({ rating: 5 })
  })
})

describe('장소 수정·삭제', () => {
  beforeEach(() => seedPlace('p1', 'alice'))

  it('등록한 사람과 오너는 고칠 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'places/p1'), { memo: '주차 가능', lat: 37.5, lng: 127.03 }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'places/p1'), { name: '레드버튼' }))
  })

  it('다른 회원은 고치거나 지울 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'places/p1'), { memo: '장난' }))
    await assertFails(deleteDoc(doc(dbAs('bob'), 'places/p1')))
  })

  it('등록자는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'places/p1'), { createdBy: 'bob' }))
  })

  it('등록한 사람과 오너는 지울 수 있다', async () => {
    await assertSucceeds(deleteDoc(doc(dbAs('alice'), 'places/p1')))
    await seedPlace('p2', 'alice')
    await assertSucceeds(deleteDoc(doc(ownerDb(), 'places/p2')))
  })
})
