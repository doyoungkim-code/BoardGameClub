import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
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

const newGame = (createdBy: string, overrides: Record<string, unknown> = {}) => ({
  name: '스플렌더',
  altName: 'Splendor',
  minPlayers: 2,
  maxPlayers: 4,
  playTimeMin: 30,
  weight: 2,
  tags: ['전략'],
  description: '',
  bggUrl: '',
  ownership: 'club',
  ownerId: null,
  borrowerId: null,
  borrowedAt: null,
  createdBy,
  createdAt: serverTimestamp(),
  ...overrides,
})

const seedGame = (id: string, createdBy: string, overrides: Record<string, unknown> = {}) =>
  seedDoc(env, `games/${id}`, { ...newGame(createdBy, overrides), createdAt: Timestamp.now() })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'carol', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('게임 읽기', () => {
  beforeEach(() => seedGame('g1', 'alice'))

  it('승인된 회원은 읽을 수 있고 대기자는 못 읽는다', async () => {
    await assertSucceeds(getDocs(collection(dbAs('alice'), 'games')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'games')))
  })
})

describe('게임 등록', () => {
  it('회원 누구나 등록할 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'games/g1'), newGame('alice')))
  })

  it('대기자는 등록할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('waiting'), 'games/g1'), newGame('waiting')))
  })

  it('등록자를 다른 사람으로 적을 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'games/g1'), newGame('bob')))
  })

  it('개인 소장은 승인된 회원을 소유자로 지정해야 한다', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('alice'), 'games/g1'), newGame('alice', { ownership: 'member', ownerId: 'bob' })),
    )
    await assertFails(
      setDoc(doc(dbAs('alice'), 'games/g2'), newGame('alice', { ownership: 'member', ownerId: null })),
    )
    await assertFails(
      setDoc(doc(dbAs('alice'), 'games/g3'), newGame('alice', { ownership: 'member', ownerId: 'waiting' })),
    )
  })

  it('동호회 공용에는 소유자를 둘 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'games/g1'), newGame('alice', { ownership: 'club', ownerId: 'alice' })))
  })

  it('빌린 상태로는 등록할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'games/g1'), newGame('alice', { borrowerId: 'alice' })))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(dbAs('alice'), `games/${Math.random()}`), newGame('alice', overrides)))
    await bad({ name: '' })
    await bad({ name: 'a'.repeat(61) })
    await bad({ minPlayers: 0 })
    await bad({ minPlayers: 5, maxPlayers: 4 }) // 최소 > 최대
    await bad({ weight: 6 })
    await bad({ weight: 2.5 })
    await bad({ playTimeMin: 0 })
    await bad({ ownership: 'shop' })
    await bad({ tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] })
    await bad({ pinned: true })
  })

  it('등록 시각을 임의로 정할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'games/g1'), newGame('alice', { createdAt: Timestamp.fromMillis(0) })))
  })
})

describe('게임 수정·삭제', () => {
  beforeEach(() => seedGame('g1', 'alice'))

  it('등록자와 오너는 수정할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'games/g1'), { description: '재밌어요' }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'games/g1'), { weight: 3 }))
  })

  it('다른 회원은 수정할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'games/g1'), { name: '장난' }))
  })

  it('등록자와 등록 시각은 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'games/g1'), { createdBy: 'bob' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'games/g1'), { createdAt: Timestamp.fromMillis(0) }))
  })

  it('수정할 때도 값 검증을 한다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'games/g1'), { maxPlayers: 1 }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'games/g1'), { ownership: 'member', ownerId: null }))
  })

  it('삭제는 등록자와 오너만 할 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('bob'), 'games/g1')))
    await assertSucceeds(deleteDoc(doc(dbAs('alice'), 'games/g1')))
  })
})

describe('대여', () => {
  it('비어 있으면 회원 누구나 빌릴 수 있다', async () => {
    await seedGame('g1', 'alice')
    await assertSucceeds(
      updateDoc(doc(dbAs('bob'), 'games/g1'), { borrowerId: 'bob', borrowedAt: serverTimestamp() }),
    )
  })

  it('다른 사람 이름으로 빌릴 수 없다', async () => {
    await seedGame('g1', 'alice')
    await assertFails(
      updateDoc(doc(dbAs('bob'), 'games/g1'), { borrowerId: 'carol', borrowedAt: serverTimestamp() }),
    )
  })

  it('빌린 시각을 임의로 정할 수 없다', async () => {
    await seedGame('g1', 'alice')
    await assertFails(
      updateDoc(doc(dbAs('bob'), 'games/g1'), { borrowerId: 'bob', borrowedAt: Timestamp.fromMillis(0) }),
    )
  })

  it('이미 빌려간 게임을 가로챌 수 없다', async () => {
    await seedGame('g1', 'alice', { borrowerId: 'bob', borrowedAt: Timestamp.now() })
    await assertFails(
      updateDoc(doc(dbAs('carol'), 'games/g1'), { borrowerId: 'carol', borrowedAt: serverTimestamp() }),
    )
  })

  it('빌린 본인은 반납할 수 있다', async () => {
    await seedGame('g1', 'alice', { borrowerId: 'bob', borrowedAt: Timestamp.now() })
    await assertSucceeds(updateDoc(doc(dbAs('bob'), 'games/g1'), { borrowerId: null, borrowedAt: null }))
  })

  it('소유자·등록자·오너는 대신 반납 처리할 수 있다', async () => {
    await seedGame('g1', 'alice', {
      ownership: 'member',
      ownerId: 'carol',
      borrowerId: 'bob',
      borrowedAt: Timestamp.now(),
    })
    await assertSucceeds(updateDoc(doc(dbAs('carol'), 'games/g1'), { borrowerId: null, borrowedAt: null }))

    await seedGame('g2', 'alice', { borrowerId: 'bob', borrowedAt: Timestamp.now() })
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'games/g2'), { borrowerId: null, borrowedAt: null }))

    await seedGame('g3', 'alice', { borrowerId: 'bob', borrowedAt: Timestamp.now() })
    await assertSucceeds(updateDoc(doc(ownerDb(), 'games/g3'), { borrowerId: null, borrowedAt: null }))
  })

  it('상관없는 회원은 남의 대여를 반납 처리할 수 없다', async () => {
    await seedGame('g1', 'alice', { borrowerId: 'bob', borrowedAt: Timestamp.now() })
    await assertFails(updateDoc(doc(dbAs('carol'), 'games/g1'), { borrowerId: null, borrowedAt: null }))
  })

  it('빌리면서 다른 필드를 같이 바꿀 수 없다', async () => {
    await seedGame('g1', 'alice')
    await assertFails(
      updateDoc(doc(dbAs('bob'), 'games/g1'), {
        borrowerId: 'bob',
        borrowedAt: serverTimestamp(),
        name: '바꾼 이름',
      }),
    )
  })

  it('대기자는 빌릴 수 없다', async () => {
    await seedGame('g1', 'alice')
    await assertFails(
      updateDoc(doc(dbAs('waiting'), 'games/g1'), { borrowerId: 'waiting', borrowedAt: serverTimestamp() }),
    )
  })
})
