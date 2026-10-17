import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { arrayUnion, doc, increment, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { createTestEnv, seedUser } from './helpers.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})

afterAll(async () => {
  await env.cleanup()
})

const dbAs = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true }).firestore()
const me = (uid = 'alice') => doc(dbAs(uid), 'users', 'alice')

/** 앱이 보내는 사기 요청 (services/shop.ts 와 같은 모양) */
const buy = (id: string, price: number, uid = 'alice') =>
  updateDoc(me(uid), { coins: increment(-price), items: arrayUnion(id), lastPurchase: id })

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'alice', { status: 'approved', coins: 100, items: ['bg-pips'] })
  await seedUser(env, 'bob', { status: 'approved', coins: 100 })
  await seedUser(env, 'poor', { status: 'approved', coins: 10 })
})

describe('상점에서 사기', () => {
  it('가격만큼 코인을 내고 산다', async () => {
    await assertSucceeds(buy('bg-checker', 30))
  })

  it('가격보다 적게 내거나 더 내면 안 된다', async () => {
    await assertFails(buy('bg-checker', 29))
    await assertFails(buy('bg-checker', 31))
  })

  it('코인이 모자라면 살 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('poor'), 'users', 'poor'), { coins: increment(-30), items: arrayUnion('bg-checker'), lastPurchase: 'bg-checker' }))
  })

  it('이미 가진 것과 없는 아이템은 살 수 없다', async () => {
    await assertFails(buy('bg-pips', 30))
    await assertFails(buy('bg-gold', 1))
  })

  it('무엇을 샀는지 적지 않거나 다르게 적으면 안 된다', async () => {
    await assertFails(updateDoc(me(), { coins: increment(-30), items: arrayUnion('bg-checker') }))
    await assertFails(updateDoc(me(), { coins: increment(-20), items: arrayUnion('prop-crown'), lastPurchase: 'prop-coffee' }))
  })

  it('남의 코인으로 살 수 없다', async () => {
    await assertFails(buy('bg-checker', 30, 'bob'))
  })

  it('코인을 그냥 늘릴 수 없다', async () => {
    await assertFails(updateDoc(me(), { coins: 9999 }))
  })
})

describe('배너에 달기', () => {
  it('가진 배경 무늬·소품을 달고 뗄 수 있다', async () => {
    await assertSucceeds(updateDoc(me(), { bannerBackground: 'bg-pips' }))
    await assertSucceeds(updateDoc(me(), { bannerBackground: null }))
  })

  it('갖지 않은 것은 달 수 없다', async () => {
    await assertFails(updateDoc(me(), { bannerBackground: 'bg-stars' }))
    await assertFails(updateDoc(me(), { bannerProp: 'prop-crown' }))
  })

  it('배경을 소품 칸에 달 수 없다', async () => {
    await assertFails(updateDoc(me(), { bannerProp: 'bg-pips' }))
  })

  it('남의 배너는 바꿀 수 없다', async () => {
    await assertFails(updateDoc(me('bob'), { bannerBackground: 'bg-pips' }))
  })
})
