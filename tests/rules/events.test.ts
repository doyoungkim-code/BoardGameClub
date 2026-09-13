import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
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

const tomorrow = () => Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)

/** 클라이언트가 보내는 새 모임 문서 */
const newEvent = (hostId: string, overrides: Record<string, unknown> = {}) => ({
  type: 'flash',
  title: '수요일 번개',
  description: '',
  location: '강남 보드게임카페',
  startAt: tomorrow(),
  endAt: null,
  capacity: null,
  hostId,
  gameIds: [],
  attendeeIds: [hostId],
  attendedIds: [],
  canceled: false,
  createdAt: serverTimestamp(),
  ...overrides,
})

/** 규칙을 끄고 미리 넣어두는 모임 (createdAt 은 실제 시각) */
const seedEvent = (id: string, hostId: string, overrides: Record<string, unknown> = {}) =>
  seedDoc(env, `events/${id}`, { ...newEvent(hostId, overrides), createdAt: Timestamp.now() })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'carol', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('모임 읽기', () => {
  beforeEach(() => seedEvent('e1', 'alice'))

  it('승인된 회원은 읽을 수 있고 대기자는 못 읽는다', async () => {
    await assertSucceeds(getDocs(collection(dbAs('alice'), 'events')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'events')))
  })
})

describe('모임 만들기', () => {
  it('회원은 번개를 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'events/e1'), newEvent('alice')))
  })

  it('정기모임은 오너만 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(ownerDb(), 'events/e1'), newEvent('owner', { type: 'regular' })))
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e2'), newEvent('alice', { type: 'regular' })))
  })

  it('대기자는 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('waiting'), 'events/e1'), newEvent('waiting')))
  })

  it('다른 사람을 호스트로 지정할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e1'), newEvent('bob')))
  })

  it('만들 때 참석자는 본인 한 명, 출석은 비어 있어야 한다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e1'), newEvent('alice', { attendeeIds: ['alice', 'bob'] })))
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e2'), newEvent('alice', { attendeeIds: [] })))
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e3'), newEvent('alice', { attendedIds: ['alice'] })))
  })

  it('취소된 상태로는 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e1'), newEvent('alice', { canceled: true })))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(dbAs('alice'), `events/${Math.random()}`), newEvent('alice', overrides)))
    await bad({ title: '' })
    await bad({ title: 'a'.repeat(51) })
    await bad({ type: 'party' })
    await bad({ capacity: 0 })
    await bad({ capacity: 3.5 })
    await bad({ endAt: Timestamp.fromMillis(0) }) // 시작보다 이른 종료
    await bad({ location: 'a'.repeat(101) })
    await bad({ pinned: true }) // 허용되지 않은 필드
  })

  it('만든 시각을 임의로 정할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'events/e1'), newEvent('alice', { createdAt: Timestamp.fromMillis(0) })))
  })
})

describe('모임 수정·삭제', () => {
  beforeEach(() => seedEvent('e1', 'alice'))

  it('호스트와 오너는 수정할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'events/e1'), { title: '장소 변경' }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'events/e1'), { location: '홍대' }))
  })

  it('다른 회원은 수정할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/e1'), { title: '장난' }))
  })

  it('유형과 호스트는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'events/e1'), { type: 'regular' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'events/e1'), { hostId: 'bob' }))
  })

  it('호스트와 오너는 모임을 취소 표시할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'events/e1'), { canceled: true }))
  })

  it('정원을 이미 참석한 인원보다 적게 줄일 수 없다', async () => {
    await seedEvent('e2', 'alice', { attendeeIds: ['alice', 'bob', 'carol'] })
    await assertFails(updateDoc(doc(dbAs('alice'), 'events/e2'), { capacity: 2 }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'events/e2'), { capacity: 3 }))
  })

  it('삭제는 호스트와 오너만 할 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('bob'), 'events/e1')))
    await assertSucceeds(deleteDoc(doc(dbAs('alice'), 'events/e1')))
  })
})

describe('참석 신청·취소', () => {
  beforeEach(() => seedEvent('e1', 'alice'))

  it('본인을 참석자에 넣고 뺄 수 있다', async () => {
    const ref = doc(dbAs('bob'), 'events/e1')
    await assertSucceeds(updateDoc(ref, { attendeeIds: arrayUnion('bob') }))
    await assertSucceeds(updateDoc(ref, { attendeeIds: arrayRemove('bob') }))
  })

  it('다른 사람을 넣거나 뺄 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/e1'), { attendeeIds: arrayUnion('carol') }))
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/e1'), { attendeeIds: arrayRemove('alice') }))
  })

  it('한 번에 여러 명을 넣을 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/e1'), { attendeeIds: ['alice', 'bob', 'carol'] }))
  })

  it('참석 신청하면서 다른 필드를 같이 바꿀 수 없다', async () => {
    await assertFails(
      updateDoc(doc(dbAs('bob'), 'events/e1'), { attendeeIds: arrayUnion('bob'), capacity: 99 }),
    )
  })

  it('정원이 찼으면 신청할 수 없다', async () => {
    await seedEvent('full', 'alice', { capacity: 2, attendeeIds: ['alice', 'carol'] })
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/full'), { attendeeIds: arrayUnion('bob') }))
    // 한 명이 취소하면 자리가 난다
    await assertSucceeds(updateDoc(doc(dbAs('carol'), 'events/full'), { attendeeIds: arrayRemove('carol') }))
    await assertSucceeds(updateDoc(doc(dbAs('bob'), 'events/full'), { attendeeIds: arrayUnion('bob') }))
  })

  it('취소된 모임에는 신청할 수 없다', async () => {
    await seedEvent('off', 'alice', { canceled: true })
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/off'), { attendeeIds: arrayUnion('bob') }))
  })

  it('대기자는 신청할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('waiting'), 'events/e1'), { attendeeIds: arrayUnion('waiting') }))
  })

  it('오너도 남을 대신 신청시킬 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'events/e1'), { attendeeIds: arrayUnion('bob') }))
  })
})

describe('출석 체크', () => {
  beforeEach(() => seedEvent('e1', 'alice', { attendeeIds: ['alice', 'bob'] }))

  it('호스트와 오너는 출석을 기록할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'events/e1'), { attendedIds: ['alice', 'bob'] }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'events/e1'), { attendedIds: ['alice'] }))
  })

  it('참석자가 아닌 사람은 출석 처리할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'events/e1'), { attendedIds: ['alice', 'carol'] }))
  })

  it('참석자 본인이라도 출석을 스스로 찍을 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'events/e1'), { attendedIds: ['bob'] }))
  })
})
