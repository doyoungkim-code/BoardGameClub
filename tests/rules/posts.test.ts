import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
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

const newPost = (authorId: string, overrides: Record<string, unknown> = {}) => ({
  board: 'free',
  title: '안녕하세요',
  content: '가입했습니다',
  authorId,
  authorNickname: '닉네임',
  pinned: false,
  likeIds: [],
  commentCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
})

const newComment = (authorId: string, overrides: Record<string, unknown> = {}) => ({
  authorId,
  authorNickname: '닉네임',
  content: '좋네요',
  createdAt: serverTimestamp(),
  ...overrides,
})

const seedPost = (id: string, authorId: string, overrides: Record<string, unknown> = {}) =>
  seedDoc(env, `posts/${id}`, {
    ...newPost(authorId, overrides),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('글 읽기', () => {
  beforeEach(() => seedPost('p1', 'alice'))

  it('승인된 회원은 읽을 수 있고 대기자는 못 읽는다', async () => {
    await assertSucceeds(getDocs(collection(dbAs('alice'), 'posts')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'posts')))
  })
})

describe('글 작성', () => {
  it('회원은 자유·후기 글을 쓸 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'posts/p1'), newPost('alice')))
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'posts/p2'), newPost('alice', { board: 'review' })))
  })

  it('공지는 오너만 쓸 수 있다', async () => {
    await assertSucceeds(setDoc(doc(ownerDb(), 'posts/p1'), newPost('owner', { board: 'notice' })))
    await assertFails(setDoc(doc(dbAs('alice'), 'posts/p2'), newPost('alice', { board: 'notice' })))
  })

  it('고정은 오너만 걸 수 있다', async () => {
    await assertSucceeds(setDoc(doc(ownerDb(), 'posts/p1'), newPost('owner', { pinned: true })))
    await assertFails(setDoc(doc(dbAs('alice'), 'posts/p2'), newPost('alice', { pinned: true })))
  })

  it('대기자는 쓸 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('waiting'), 'posts/p1'), newPost('waiting')))
  })

  it('다른 사람 이름으로 쓸 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'posts/p1'), newPost('bob')))
  })

  it('좋아요·댓글 수를 미리 채워 넣을 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'posts/p1'), newPost('alice', { likeIds: ['alice'] })))
    await assertFails(setDoc(doc(dbAs('alice'), 'posts/p2'), newPost('alice', { commentCount: 5 })))
  })

  it('잘못된 값은 거부된다', async () => {
    const bad = (overrides: Record<string, unknown>) =>
      assertFails(setDoc(doc(dbAs('alice'), `posts/${Math.random()}`), newPost('alice', overrides)))
    await bad({ title: '' })
    await bad({ title: 'a'.repeat(101) })
    await bad({ content: '' })
    await bad({ board: 'secret' })
    await bad({ createdAt: Timestamp.fromMillis(0) })
    await bad({ extra: true })
  })
})

describe('글 수정·삭제', () => {
  beforeEach(() => seedPost('p1', 'alice'))

  it('글쓴이와 오너는 수정할 수 있다', async () => {
    await assertSucceeds(
      updateDoc(doc(dbAs('alice'), 'posts/p1'), { content: '고쳤어요', updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(updateDoc(doc(ownerDb(), 'posts/p1'), { title: '정리', updatedAt: serverTimestamp() }))
  })

  it('다른 회원은 수정할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { content: '장난', updatedAt: serverTimestamp() }))
  })

  it('수정 시각을 빼거나 조작할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'posts/p1'), { content: '고쳤어요' }))
    await assertFails(
      updateDoc(doc(dbAs('alice'), 'posts/p1'), { content: '고쳤어요', updatedAt: Timestamp.fromMillis(0) }),
    )
  })

  it('글을 공지 게시판으로 옮길 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'posts/p1'), { board: 'notice', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(ownerDb(), 'posts/p1'), { board: 'notice', updatedAt: serverTimestamp() }))
  })

  it('고정은 오너만 바꿀 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'posts/p1'), { pinned: true }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'posts/p1'), { pinned: true }))
  })

  it('삭제는 글쓴이와 오너만 할 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('bob'), 'posts/p1')))
    await assertSucceeds(deleteDoc(doc(dbAs('alice'), 'posts/p1')))
  })
})

describe('좋아요', () => {
  beforeEach(() => seedPost('p1', 'alice'))

  it('본인 좋아요만 넣고 뺄 수 있다', async () => {
    const ref = doc(dbAs('bob'), 'posts/p1')
    await assertSucceeds(updateDoc(ref, { likeIds: arrayUnion('bob') }))
    await assertSucceeds(updateDoc(ref, { likeIds: arrayRemove('bob') }))
  })

  it('다른 사람 좋아요를 조작할 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { likeIds: arrayUnion('alice') }))
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { likeIds: ['bob', 'alice'] }))
  })

  it('좋아요를 누르면서 다른 값을 같이 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { likeIds: arrayUnion('bob'), pinned: true }))
  })
})

describe('댓글', () => {
  beforeEach(() => seedPost('p1', 'alice'))

  const commentsOf = (uid: string) => collection(dbAs(uid), 'posts/p1/comments')

  it('회원은 댓글과 개수를 한 번에 쓸 수 있다', async () => {
    const db = dbAs('bob')
    const batch = writeBatch(db)
    batch.set(doc(collection(db, 'posts/p1/comments')), newComment('bob'))
    batch.update(doc(db, 'posts/p1'), { commentCount: increment(1) })
    await assertSucceeds(batch.commit())
  })

  it('대기자는 댓글을 읽거나 쓸 수 없다', async () => {
    await assertFails(getDocs(commentsOf('waiting')))
    await assertFails(setDoc(doc(commentsOf('waiting')), newComment('waiting')))
  })

  it('다른 사람 이름으로 쓸 수 없다', async () => {
    await assertFails(setDoc(doc(commentsOf('bob')), newComment('alice')))
  })

  it('빈 댓글과 2000자 초과는 거부된다', async () => {
    await assertFails(setDoc(doc(commentsOf('bob')), newComment('bob', { content: '' })))
    await assertFails(setDoc(doc(commentsOf('bob')), newComment('bob', { content: 'a'.repeat(2001) })))
  })

  it('댓글 수를 한 번에 여러 개 올릴 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { commentCount: increment(5) }))
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { commentCount: 99 }))
  })

  it('댓글 수가 음수가 될 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'posts/p1'), { commentCount: increment(-1) }))
  })

  describe('쓴 뒤', () => {
    beforeEach(async () => {
      await seedDoc(env, 'posts/p1/comments/c1', { ...newComment('bob'), createdAt: Timestamp.now() })
    })

    it('쓴 사람은 고칠 수 있고 남은 못 고친다', async () => {
      await assertSucceeds(updateDoc(doc(commentsOf('bob'), 'c1'), { content: '고쳤어요' }))
      await assertFails(updateDoc(doc(commentsOf('alice'), 'c1'), { content: '장난' }))
    })

    it('쓴 사람과 오너는 지울 수 있다', async () => {
      await assertFails(deleteDoc(doc(commentsOf('alice'), 'c1')))
      await assertSucceeds(deleteDoc(doc(ownerDb(), 'posts/p1/comments/c1')))
    })

    it('글쓴이가 댓글을 지우면서 개수를 줄일 수 있다', async () => {
      await seedPost('p2', 'alice', { commentCount: 1 })
      await seedDoc(env, 'posts/p2/comments/c1', { ...newComment('bob'), createdAt: Timestamp.now() })
      const db = dbAs('bob')
      const batch = writeBatch(db)
      batch.delete(doc(db, 'posts/p2/comments/c1'))
      batch.update(doc(db, 'posts/p2'), { commentCount: increment(-1) })
      await assertSucceeds(batch.commit())
    })
  })
})

describe('adminMemos', () => {
  it('오너만 읽고 쓸 수 있다', async () => {
    await assertSucceeds(
      setDoc(doc(ownerDb(), 'adminMemos/alice'), { memo: '보드게임 카페 사장님', updatedAt: serverTimestamp() }),
    )
    await assertFails(
      setDoc(doc(dbAs('alice'), 'adminMemos/bob'), { memo: '엿보기', updatedAt: serverTimestamp() }),
    )
    await assertFails(getDocs(collection(dbAs('alice'), 'adminMemos')))
  })

  it('허용되지 않은 필드나 조작한 시각은 거부된다', async () => {
    await assertFails(
      setDoc(doc(ownerDb(), 'adminMemos/alice'), { memo: '메모', updatedAt: Timestamp.fromMillis(0) }),
    )
    await assertFails(
      setDoc(doc(ownerDb(), 'adminMemos/alice'), { memo: '메모', updatedAt: serverTimestamp(), secret: 1 }),
    )
  })
})
