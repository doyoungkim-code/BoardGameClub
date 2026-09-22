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
  updateDoc,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { createTestEnv, newUserData, OWNER_EMAIL, ownerAuth, seedUser } from './helpers.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

const dbAs = (uid: string, token: Record<string, unknown> = { email: `${uid}@example.com`, email_verified: true }) =>
  env.authenticatedContext(uid, token).firestore()

describe('users 생성 (가입 신청)', () => {
  it('본인 uid로 pending 신청을 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'users/alice'), newUserData()))
  })

  it('다른 사람 uid로는 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'users/bob'), newUserData()))
  })

  it('로그인하지 않으면 만들 수 없다', async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice'), newUserData()))
  })

  it('스스로 approved 상태로 만들 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'users/alice'), newUserData({ status: 'approved' })))
  })

  it('스스로 owner 역할로 만들 수 없다', async () => {
    await assertFails(
      setDoc(
        doc(dbAs('alice'), 'users/alice'),
        newUserData({ role: 'owner', status: 'approved', approvedAt: serverTimestamp() }),
      ),
    )
  })

  it('소개자 이름이 비어 있으면 신청할 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'users/alice'), newUserData({ referrerName: '' })))
  })

  it('소개 회원 연결(referrerId)을 스스로 넣을 수 없다', async () => {
    await seedUser(env, 'bob', { status: 'approved' })
    await assertFails(setDoc(doc(dbAs('alice'), 'users/alice'), newUserData({ referrerId: 'bob' })))
  })

  it('허용되지 않은 필드는 넣을 수 없다', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'users/alice'), newUserData({ isAdmin: true })))
  })

  it('오너 계정은 바로 승인된 owner로 만들 수 있다', async () => {
    await assertSucceeds(
      setDoc(
        doc(dbAs('owner', ownerAuth), 'users/owner'),
        newUserData({ role: 'owner', status: 'approved', approvedAt: serverTimestamp(), referrerName: '' }),
      ),
    )
  })

  it('이메일 인증이 안 된 오너 이메일은 owner로 만들 수 없다', async () => {
    await assertFails(
      setDoc(
        doc(dbAs('fake', { email: OWNER_EMAIL, email_verified: false }), 'users/fake'),
        newUserData({ role: 'owner', status: 'approved', approvedAt: serverTimestamp() }),
      ),
    )
  })
})

describe('users 읽기', () => {
  beforeEach(async () => {
    await seedUser(env, 'member1', { status: 'approved', nickname: '회원1' })
    await seedUser(env, 'waiting', { status: 'pending' })
  })

  it('비로그인은 읽을 수 없다', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/member1')))
  })

  it('대기 중인 사용자는 본인 문서만 읽을 수 있다', async () => {
    await assertSucceeds(getDoc(doc(dbAs('waiting'), 'users/waiting')))
    await assertFails(getDoc(doc(dbAs('waiting'), 'users/member1')))
    await assertFails(getDocs(query(collection(dbAs('waiting'), 'users'), where('status', '==', 'approved'))))
  })

  it('승인된 회원은 다른 회원 문서와 목록을 읽을 수 있다', async () => {
    await assertSucceeds(getDoc(doc(dbAs('member1'), 'users/waiting')))
    await assertSucceeds(getDocs(query(collection(dbAs('member1'), 'users'), where('status', '==', 'approved'))))
  })

  it('강퇴된 회원은 다른 회원 문서를 읽을 수 없다', async () => {
    await seedUser(env, 'kicked', { status: 'removed' })
    await assertSucceeds(getDoc(doc(dbAs('kicked'), 'users/kicked')))
    await assertFails(getDoc(doc(dbAs('kicked'), 'users/member1')))
  })

  it('오너는 문서가 없어도 대기 목록을 읽을 수 있다', async () => {
    await assertSucceeds(getDocs(query(collection(dbAs('owner', ownerAuth), 'users'), where('status', '==', 'pending'))))
  })
})

describe('users 본인 수정', () => {
  beforeEach(async () => {
    await seedUser(env, 'alice', { status: 'approved' })
  })

  it('닉네임은 바꿀 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'users/alice'), { nickname: '새닉네임' }))
  })

  it('최근 활동일은 서버 시간으로만 바꿀 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'users/alice'), { lastActiveAt: serverTimestamp() }))
  })

  it('21자 이상 닉네임은 안 된다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { nickname: '가'.repeat(21) }))
  })

  it('본인 status는 바꿀 수 없다', async () => {
    await seedUser(env, 'bob', { status: 'pending' })
    await assertFails(updateDoc(doc(dbAs('bob'), 'users/bob'), { status: 'approved' }))
  })

  it('본인 role은 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { role: 'owner' }))
  })

  it('본인 소개자 연결(referrerId)은 바꿀 수 없다', async () => {
    await seedUser(env, 'bob', { status: 'approved' })
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { referrerId: 'bob' }))
  })

  it('다른 회원 문서는 수정할 수 없다', async () => {
    await seedUser(env, 'bob', { status: 'pending' })
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/bob'), { status: 'approved' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/bob'), { nickname: '장난' }))
  })

  it('본인 문서도 삭제할 수 없다', async () => {
    await assertFails(deleteDoc(doc(dbAs('alice'), 'users/alice')))
  })
})

describe('users 오너 관리', () => {
  beforeEach(async () => {
    await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
    await seedUser(env, 'referrer', { status: 'approved', nickname: '김철수' })
    await seedUser(env, 'applicant', { status: 'pending' })
  })

  const ownerDb = () => dbAs('owner', ownerAuth)

  it('승인하면서 소개 회원을 연결할 수 있다', async () => {
    await assertSucceeds(
      updateDoc(doc(ownerDb(), 'users/applicant'), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        referrerId: 'referrer',
      }),
    )
  })

  it("소개자 자리에 '초기 멤버'를 넣을 수 있다", async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'users/applicant'), { referrerId: 'founder' }))
  })

  it("일반 회원은 스스로 '초기 멤버'가 될 수 없다", async () => {
    await assertFails(updateDoc(doc(dbAs('referrer'), 'users/referrer'), { referrerId: 'founder' }))
  })

  it('없는 회원을 소개자로 연결할 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'users/applicant'), { referrerId: 'ghost' }))
  })

  it('자기 자신을 소개자로 연결할 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'users/applicant'), { referrerId: 'applicant' }))
  })

  it('거절·강퇴할 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'users/applicant'), { status: 'rejected' }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'users/referrer'), { status: 'removed' }))
  })

  it('정의되지 않은 상태값은 넣을 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'users/applicant'), { status: 'vip' }))
  })

  it('오너도 회원의 역할은 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'users/referrer'), { role: 'owner' }))
  })

  it('오너 자신의 상태는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'users/owner'), { status: 'removed' }))
  })

  it('오너 이메일이 아닌 승인 회원은 다른 사람을 승인할 수 없다', async () => {
    await assertFails(
      updateDoc(doc(dbAs('referrer'), 'users/applicant'), { status: 'approved', approvedAt: serverTimestamp() }),
    )
  })
})

describe('칭호', () => {
  beforeEach(async () => {
    await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
    await seedUser(env, 'alice', { status: 'approved' })
    await seedUser(env, 'bob', { status: 'approved' })
  })

  const ownerDb = () => dbAs('owner', ownerAuth)

  it('오너는 회원에게 칭호를 주고 뺄 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'users/alice'), { grantedTitles: ['granted:올해의 MVP'] }))
    await assertSucceeds(updateDoc(doc(ownerDb(), 'users/alice'), { grantedTitles: [] }))
  })

  it('칭호는 20개까지만 줄 수 있다', async () => {
    const many = Array.from({ length: 21 }, (_, i) => `granted:칭호${i}`)
    await assertFails(updateDoc(doc(ownerDb(), 'users/alice'), { grantedTitles: many }))
  })

  it('회원은 스스로 칭호를 받을 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { grantedTitles: ['granted:셀프 칭호'] }))
  })

  it('본인은 대표 칭호를 고르고 없앨 수 있다', async () => {
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'users/alice'), { titleId: 'auto:flash-host-5' }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'users/alice'), { titleId: null }))
  })

  it('남의 대표 칭호는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('bob'), 'users/alice'), { titleId: 'auto:flash-host-5' }))
  })

  it('받은 칭호만 대표로 고를 수 있다', async () => {
    await seedUser(env, 'alice', { status: 'approved', grantedTitles: ['granted:올해의 MVP'] })
    await assertSucceeds(updateDoc(doc(dbAs('alice'), 'users/alice'), { titleId: 'granted:올해의 MVP' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { titleId: 'granted:받은 적 없는 칭호' }))
  })

  it('정해진 모양이 아닌 칭호 값은 거부된다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { titleId: '아무 말' }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'users/alice'), { titleId: `auto:${'a'.repeat(40)}` }))
  })
})

describe('userPrivate', () => {
  beforeEach(async () => {
    await seedUser(env, 'member1', { status: 'approved' })
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'userPrivate/member1'), { email: 'member1@example.com' })
    })
  })

  it('본인 이메일로만 만들 수 있다', async () => {
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'userPrivate/alice'), { email: 'alice@example.com' }))
    await assertFails(setDoc(doc(dbAs('bob'), 'userPrivate/bob'), { email: 'someone@example.com' }))
  })

  it('다른 승인 회원은 읽을 수 없고 본인과 오너만 읽을 수 있다', async () => {
    await seedUser(env, 'member2', { status: 'approved' })
    await assertFails(getDoc(doc(dbAs('member2'), 'userPrivate/member1')))
    await assertSucceeds(getDoc(doc(dbAs('member1'), 'userPrivate/member1')))
    await assertSucceeds(getDoc(doc(dbAs('owner', ownerAuth), 'userPrivate/member1')))
  })

  it('만든 뒤에는 이메일을 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('member1'), 'userPrivate/member1'), { email: 'other@example.com' }))
  })
})
