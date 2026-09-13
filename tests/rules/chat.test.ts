import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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

const newMessage = (senderId: string, overrides: Record<string, unknown> = {}) => ({
  senderId,
  senderNickname: '닉네임',
  text: '안녕하세요',
  createdAt: serverTimestamp(),
  deleted: false,
  ...overrides,
})

const newChannel = (overrides: Record<string, unknown> = {}) => ({
  name: '전체',
  description: '',
  order: 0,
  createdAt: serverTimestamp(),
  createdBy: 'owner',
  lastMessageAt: null,
  lastMessagePreview: '',
  lastSenderId: null,
  ...overrides,
})

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'carol', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
  await seedDoc(env, 'channels/general', { ...newChannel(), createdAt: Timestamp.now() })
})

describe('channels', () => {
  it('승인된 회원은 채널 목록을 읽을 수 있고 대기자는 못 읽는다', async () => {
    await assertSucceeds(getDocs(collection(dbAs('alice'), 'channels')))
    await assertFails(getDocs(collection(dbAs('waiting'), 'channels')))
  })

  it('채널은 오너만 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(ownerDb(), 'channels/new'), newChannel()))
    await assertFails(setDoc(doc(dbAs('alice'), 'channels/new2'), newChannel({ createdBy: 'alice' })))
  })

  it('채널 이름은 오너만 바꿀 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'channels/general'), { name: '공지' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'channels/general'), { name: '장난' }))
  })

  it('채널 삭제는 오너만 할 수 있다', async () => {
    await assertFails(deleteDoc(doc(dbAs('alice'), 'channels/general')))
    await assertSucceeds(deleteDoc(doc(ownerDb(), 'channels/general')))
  })

  it('회원은 본인이 보낸 마지막 메시지 정보만 갱신할 수 있다', async () => {
    const ref = doc(dbAs('alice'), 'channels/general')
    await assertSucceeds(
      updateDoc(ref, { lastMessageAt: serverTimestamp(), lastMessagePreview: '안녕', lastSenderId: 'alice' }),
    )
    await assertFails(
      updateDoc(ref, { lastMessageAt: serverTimestamp(), lastMessagePreview: '안녕', lastSenderId: 'bob' }),
    )
    await assertFails(
      updateDoc(ref, { lastMessageAt: serverTimestamp(), lastMessagePreview: '안녕', lastSenderId: 'alice', order: 9 }),
    )
  })
})

describe('채널 메시지', () => {
  const messagesOf = (uid: string) => collection(dbAs(uid), 'channels/general/messages')

  it('회원은 메시지와 방 정보를 한 번에 보낼 수 있다', async () => {
    const db = dbAs('alice')
    const batch = writeBatch(db)
    batch.set(doc(collection(db, 'channels/general/messages')), newMessage('alice'))
    batch.update(doc(db, 'channels/general'), {
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: '안녕하세요',
      lastSenderId: 'alice',
    })
    await assertSucceeds(batch.commit())
  })

  it('대기자는 메시지를 읽거나 보낼 수 없다', async () => {
    await assertFails(getDocs(messagesOf('waiting')))
    await assertFails(setDoc(doc(messagesOf('waiting')), newMessage('waiting')))
  })

  it('다른 사람 이름으로 보낼 수 없다', async () => {
    await assertFails(setDoc(doc(messagesOf('alice')), newMessage('bob')))
  })

  it('빈 메시지, 2000자 초과, 허용되지 않은 필드는 거부된다', async () => {
    await assertFails(setDoc(doc(messagesOf('alice')), newMessage('alice', { text: '' })))
    await assertFails(setDoc(doc(messagesOf('alice')), newMessage('alice', { text: 'a'.repeat(2001) })))
    await assertFails(setDoc(doc(messagesOf('alice')), newMessage('alice', { pinned: true })))
  })

  it('보낸 시각을 임의로 정할 수 없다', async () => {
    await assertFails(setDoc(doc(messagesOf('alice')), newMessage('alice', { createdAt: Timestamp.fromMillis(0) })))
  })

  describe('삭제', () => {
    beforeEach(async () => {
      await seedDoc(env, 'channels/general/messages/m1', { ...newMessage('alice'), createdAt: Timestamp.now() })
    })

    it('보낸 사람은 삭제 표시할 수 있다', async () => {
      await assertSucceeds(updateDoc(doc(messagesOf('alice'), 'm1'), { deleted: true, text: '' }))
    })

    it('오너는 다른 사람 메시지도 삭제 표시할 수 있다', async () => {
      await assertSucceeds(updateDoc(doc(ownerDb(), 'channels/general/messages/m1'), { deleted: true, text: '' }))
    })

    it('다른 회원은 삭제할 수 없다', async () => {
      await assertFails(updateDoc(doc(messagesOf('bob'), 'm1'), { deleted: true, text: '' }))
    })

    it('내용 수정이나 완전 삭제는 할 수 없다', async () => {
      await assertFails(updateDoc(doc(messagesOf('alice'), 'm1'), { text: '고친 내용' }))
      await assertFails(deleteDoc(doc(messagesOf('alice'), 'm1')))
    })

    describe('목록 미리보기 지우기', () => {
      beforeEach(async () => {
        await seedDoc(env, 'channels/general', {
          ...newChannel(),
          createdAt: Timestamp.now(),
          lastMessageAt: Timestamp.now(),
          lastMessagePreview: '안녕하세요',
          lastSenderId: 'alice',
        })
      })

      it('마지막 메시지를 보낸 사람과 오너는 미리보기를 지울 수 있다', async () => {
        await assertSucceeds(updateDoc(doc(dbAs('alice'), 'channels/general'), { lastMessagePreview: '삭제된 메시지' }))
        await assertSucceeds(updateDoc(doc(ownerDb(), 'channels/general'), { lastMessagePreview: '삭제된 메시지' }))
      })

      it('다른 회원은 지울 수 없다', async () => {
        await assertFails(updateDoc(doc(dbAs('bob'), 'channels/general'), { lastMessagePreview: '삭제된 메시지' }))
      })

      it('미리보기를 임의의 내용으로 바꿀 수는 없다', async () => {
        await assertFails(updateDoc(doc(dbAs('alice'), 'channels/general'), { lastMessagePreview: '아무 말' }))
      })
    })
  })
})

describe('dms', () => {
  const newDm = (a: string, b: string, overrides: Record<string, unknown> = {}) => ({
    memberIds: [a, b].sort(),
    createdAt: serverTimestamp(),
    lastMessageAt: null,
    lastMessagePreview: '',
    lastSenderId: null,
    ...overrides,
  })

  it('참여자는 아직 없는 방을 조회하고 만들 수 있다', async () => {
    const ref = doc(dbAs('alice'), 'dms/alice_bob')
    await assertSucceeds(getDoc(ref))
    await assertSucceeds(setDoc(ref, newDm('alice', 'bob')))
  })

  it('정렬되지 않은 ID로는 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'dms/bob_alice'), newDm('alice', 'bob')))
  })

  it('본인이 빠진 방은 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'dms/bob_carol'), newDm('bob', 'carol')))
  })

  it('승인되지 않은 사람과는 방을 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'dms/alice_waiting'), newDm('alice', 'waiting')))
  })

  describe('만들어진 방', () => {
    beforeEach(async () => {
      await seedDoc(env, 'dms/alice_bob', { ...newDm('alice', 'bob'), createdAt: Timestamp.now() })
      await seedDoc(env, 'dms/alice_bob/messages/m1', { ...newMessage('alice'), createdAt: Timestamp.now() })
    })

    it('제3자는 방과 메시지를 읽을 수 없다', async () => {
      await assertFails(getDoc(doc(dbAs('carol'), 'dms/alice_bob')))
      await assertFails(getDocs(collection(dbAs('carol'), 'dms/alice_bob/messages')))
      await assertFails(getDocs(query(collection(dbAs('carol'), 'dms'), where('memberIds', 'array-contains', 'alice'))))
    })

    it('오너도 남의 DM은 읽을 수 없다', async () => {
      await assertFails(getDocs(collection(ownerDb(), 'dms/alice_bob/messages')))
    })

    it('참여자는 내 DM 목록과 메시지를 읽을 수 있다', async () => {
      await assertSucceeds(getDocs(query(collection(dbAs('bob'), 'dms'), where('memberIds', 'array-contains', 'bob'))))
      await assertSucceeds(getDocs(collection(dbAs('bob'), 'dms/alice_bob/messages')))
    })

    it('참여자는 메시지를 보내고 방 정보를 갱신할 수 있다', async () => {
      const db = dbAs('bob')
      const batch = writeBatch(db)
      batch.set(doc(collection(db, 'dms/alice_bob/messages')), newMessage('bob'))
      batch.update(doc(db, 'dms/alice_bob'), {
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: '안녕하세요',
        lastSenderId: 'bob',
      })
      await assertSucceeds(batch.commit())
    })

    it('강퇴된 참여자는 더 이상 읽거나 보낼 수 없다', async () => {
      await seedUser(env, 'bob', { status: 'removed' })
      await assertFails(getDocs(collection(dbAs('bob'), 'dms/alice_bob/messages')))
      await assertFails(setDoc(doc(collection(dbAs('bob'), 'dms/alice_bob/messages')), newMessage('bob')))
    })

    it('상대 메시지는 삭제할 수 없다', async () => {
      await assertFails(updateDoc(doc(dbAs('bob'), 'dms/alice_bob/messages/m1'), { deleted: true, text: '' }))
      await assertSucceeds(updateDoc(doc(dbAs('alice'), 'dms/alice_bob/messages/m1'), { deleted: true, text: '' }))
    })

    it('마지막 메시지를 보낸 사람만 미리보기를 지울 수 있다', async () => {
      await seedDoc(env, 'dms/alice_bob', {
        ...newDm('alice', 'bob'),
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
        lastMessagePreview: '안녕하세요',
        lastSenderId: 'alice',
      })
      await assertFails(updateDoc(doc(dbAs('bob'), 'dms/alice_bob'), { lastMessagePreview: '삭제된 메시지' }))
      await assertSucceeds(updateDoc(doc(dbAs('alice'), 'dms/alice_bob'), { lastMessagePreview: '삭제된 메시지' }))
    })
  })

  it('방이 없으면 메시지를 보낼 수 없다', async () => {
    await assertFails(setDoc(doc(collection(dbAs('alice'), 'dms/alice_carol/messages')), newMessage('alice')))
  })
})

describe('readStates', () => {
  it('본인 읽음 시각은 서버 시간으로만 기록할 수 있다', async () => {
    const ref = doc(dbAs('alice'), 'users/alice/readStates/channel_general')
    await assertSucceeds(setDoc(ref, { lastReadAt: serverTimestamp() }))
    await assertFails(setDoc(ref, { lastReadAt: Timestamp.fromMillis(0) }))
  })

  it('다른 사람 읽음 기록은 읽거나 쓸 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('bob'), 'users/alice/readStates/channel_general'), { lastReadAt: serverTimestamp() }))
    await assertFails(getDocs(collection(dbAs('bob'), 'users/alice/readStates')))
  })
})
