import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
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

const OPTIONS = [
  { id: 'a', date: '2026-09-27', time: '19:00' },
  { id: 'b', date: '2026-09-28', time: '' },
  { id: 'c', date: '2026-10-03', time: '14:00' },
]

const newPoll = (createdBy: string, overrides: Record<string, unknown> = {}) => ({
  title: '다음 모임 언제?',
  description: '',
  location: '',
  options: OPTIONS,
  votes: {},
  createdBy,
  createdAt: serverTimestamp(),
  status: 'open',
  eventId: null,
  ...overrides,
})

const seedPoll = (id: string, createdBy: string, overrides: Record<string, unknown> = {}) =>
  seedDoc(env, `polls/${id}`, { ...newPoll(createdBy, overrides), createdAt: Timestamp.now() })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('투표 읽기·만들기', () => {
  it('승인된 회원은 읽을 수 있고 대기자는 못 읽는다', async () => {
    await seedPoll('p1', 'alice')
    await assertSucceeds(getDocs(collection(dbAs('bob'), 'polls')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'polls')))
  })

  it('회원 누구나 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'polls/p1'), newPoll('alice')))
  })

  it('대기자·다른 사람 이름으로는 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('waiting'), 'polls/p1'), newPoll('waiting')))
    await assertFails(setDoc(doc(dbAs('alice'), 'polls/p2'), newPoll('bob')))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(dbAs('alice'), `polls/${Math.random()}`), newPoll('alice', overrides)))
    await bad({ title: '' })
    await bad({ options: [OPTIONS[0]] }) // 후보는 2개 이상
    await bad({ options: Array.from({ length: 11 }, (_, i) => ({ id: `${i}`, date: '2026-10-01', time: '' })) })
    await bad({ votes: { alice: ['a'] } }) // 표를 미리 채울 수 없다
    await bad({ status: 'closed' })
    await bad({ eventId: 'e1' })
    await bad({ createdAt: Timestamp.fromMillis(0) })
    await bad({ extra: true })
  })
})

describe('투표하기', () => {
  beforeEach(() => seedPoll('p1', 'alice', { votes: { alice: ['a'] } }))

  it('자기 표를 넣고 바꾸고 지울 수 있다', async () => {
    const ref = doc(dbAs('bob'), 'polls/p1')
    await assertSucceeds(updateDoc(ref, { 'votes.bob': ['a', 'c'] }))
    await assertSucceeds(updateDoc(ref, { 'votes.bob': ['b'] }))
    await assertSucceeds(updateDoc(ref, { 'votes.bob': deleteField() }))
  })

  it('남의 표는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'polls/p1'), { 'votes.alice': [] }))
  })

  it('후보 수보다 많이 고를 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'polls/p1'), { 'votes.bob': ['a', 'b', 'c', 'd'] }))
  })

  it('투표하면서 다른 내용을 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'polls/p1'), { 'votes.bob': ['a'], title: '장난' }))
  })

  it('마감된 투표에는 표를 넣을 수 없다', async () => {
    await seedPoll('closed', 'alice', { status: 'closed' })
    await assertFails(updateDoc(doc(dbAs('bob'), 'polls/closed'), { 'votes.bob': ['a'] }))
  })

  it('대기자는 투표할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('waiting'), 'polls/p1'), { 'votes.waiting': ['a'] }))
  })
})

describe('수정·마감·삭제', () => {
  beforeEach(() => seedPoll('p1', 'alice'))

  it('만든 사람과 오너는 내용을 고칠 수 있고 다른 회원은 못 고친다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'polls/p1'), { title: '10월 모임 언제?' }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'polls/p1'), { location: '홍대' }))
    await assertFails(updateDoc(doc(dbAs('bob'), 'polls/p1'), { title: '장난' }))
  })

  it('만든 사람은 모임을 만들면서 투표를 마감할 수 있다', async () => {
    const db = dbAs('alice')
    const batch = writeBatch(db)
    batch.set(doc(db, 'events/e1'), {
      title: '다음 모임 언제?',
      description: '',
      location: '',
      startAt: Timestamp.fromMillis(Date.now() + 86_400_000),
      endAt: null,
      capacity: null,
      hostId: 'alice',
      gameIds: [],
      attendeeIds: ['alice'],
      attendedIds: [],
      canceled: false,
      createdAt: serverTimestamp(),
    })
    batch.update(doc(db, 'polls/p1'), { status: 'closed', eventId: 'e1' })
    await assertSucceeds(batch.commit())
  })

  it('다른 회원은 마감할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'polls/p1'), { status: 'closed', eventId: null }))
  })

  it('다시 열 때는 연결된 모임을 지운다', async () => {
    await seedPoll('closed', 'alice', { status: 'closed', eventId: 'e1' })
    await assertFails(updateDoc(doc(dbAs('alice'), 'polls/closed'), { status: 'open' }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'polls/closed'), { status: 'open', eventId: null }))
  })

  it('삭제는 만든 사람과 오너만 할 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('bob'), 'polls/p1')))
    await assertSucceeds(deleteDoc(doc(dbAs('alice'), 'polls/p1')))
  })
})
