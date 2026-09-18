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

/** 즐겨찾기 문서 (ID 는 카카오 장소 ID) */
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

const seedPlace = (id: string) => seedDoc(env, `places/${id}`, { ...newPlace('owner'), createdAt: Timestamp.now() })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('즐겨찾기 읽기', () => {
  it('승인된 회원은 읽을 수 있고 대기자는 못 읽는다', async () => {
    await seedPlace('12345')
    await assertSucceeds(getDocs(collection(dbAs('alice'), 'places')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'places')))
  })
})

describe('즐겨찾기 추가', () => {
  it('오너만 추가할 수 있다', async () => {
    await assertSucceeds(setDoc(doc(ownerDb(), 'places/12345'), newPlace('owner')))
    await assertFails(setDoc(doc(dbAs('alice'), 'places/67890'), newPlace('alice')))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(ownerDb(), `places/${Math.random()}`), newPlace('owner', overrides)))
    await bad({ name: '' })
    await bad({ name: 'a'.repeat(41) })
    await bad({ lat: 91 })
    await bad({ lng: -181 })
    await bad({ lat: '37.5' })
    await bad({ memo: 'a'.repeat(301) })
    await bad({ createdBy: 'alice' })
    await bad({ createdAt: Timestamp.fromMillis(0) })
    await bad({ rating: 5 })
  })
})

describe('메모 수정·즐겨찾기 해제', () => {
  beforeEach(() => seedPlace('12345'))

  it('오너는 메모를 고칠 수 있고 회원은 못 고친다', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'places/12345'), { memo: '9월 정모 장소' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'places/12345'), { memo: '장난' }))
  })

  it('등록자는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'places/12345'), { createdBy: 'alice' }))
  })

  it('오너만 즐겨찾기를 해제할 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('alice'), 'places/12345')))
    await assertSucceeds(deleteDoc(doc(ownerDb(), 'places/12345')))
  })
})
