import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { coinsOf, diceFaces, todayRollId, type RollKind } from '../../src/data/dice.ts'
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

const HOUR = 60 * 60 * 1000
const at = (offset: number) => Timestamp.fromMillis(Date.now() + offset)

const seedEvent = (id: string, overrides: Record<string, unknown>) =>
  seedDoc(env, `events/${id}`, {
    title: '모임',
    description: '',
    location: '',
    startAt: at(-HOUR),
    endAt: null,
    capacity: null,
    hostId: 'owner',
    gameIds: [],
    attendeeIds: [],
    attendedIds: [],
    canceled: false,
    createdAt: at(-2 * HOUR),
    ...overrides,
  })

const newRoll = (kind: RollKind, eventId: string | null = null) => ({
  kind,
  eventId,
  rolledAt: serverTimestamp(),
  claimed: false,
})

const rollDoc = (db: ReturnType<typeof dbAs>, uid: string, rollId: string) => doc(db, `users/${uid}/rolls/${rollId}`)

/** 굴린 뒤 서버 시각으로 정해진 보상 (앱과 같은 계산식) */
async function rewardOf(uid: string, rollId: string, kind: RollKind) {
  const snap = await getDoc(rollDoc(dbAs(uid), uid, rollId))
  return coinsOf(diceFaces((snap.data()!.rolledAt as Timestamp).toMillis(), kind))
}

/** 보상 받기 batch: 굴림을 claimed 로 바꾸고 users 의 경험치·코인을 올린다 */
function claim(uid: string, rollId: string, values: { diceXp: number; coins: number }) {
  const db = dbAs(uid)
  const batch = writeBatch(db)
  batch.update(rollDoc(db, uid, rollId), { claimed: true })
  batch.update(doc(db, 'users', uid), { ...values, lastRollId: rollId })
  return batch.commit()
}

beforeEach(async () => {
  await env.clearFirestore()
  await seedUser(env, 'owner', { role: 'owner', status: 'approved', referrerName: '' })
  await seedUser(env, 'alice', { status: 'approved' })
  await seedUser(env, 'bob', { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
  // 출석 인정: 시작했고 참석자 (출석 체크 안 한 모임)
  await seedEvent('past', { attendeeIds: ['alice'] })
  // 출석 체크를 했는데 alice 는 체크 안 됨
  await seedEvent('checked', { attendeeIds: ['alice', 'bob'], attendedIds: ['bob'] })
  await seedEvent('future', { attendeeIds: ['alice'], startAt: at(HOUR) })
  await seedEvent('canceled', { attendeeIds: ['alice'], canceled: true })
  await seedEvent('others', { attendeeIds: ['bob'] })
})

describe('주사위 굴리기', () => {
  it('오늘의 주사위를 굴릴 수 있다', async () => {
    await assertSucceeds(setDoc(rollDoc(dbAs('alice'), 'alice', todayRollId()), newRoll('day')))
  })

  it('굴린 시각은 서버 시각이어야 한다 (원하는 눈이 나오는 시각을 적을 수 없다)', async () => {
    await assertFails(
      setDoc(rollDoc(dbAs('alice'), 'alice', todayRollId()), { ...newRoll('day'), rolledAt: Timestamp.now() }),
    )
  })

  it('오늘이 아닌 날짜로는 굴릴 수 없다', async () => {
    await assertFails(setDoc(rollDoc(dbAs('alice'), 'alice', 'day-19990101'), newRoll('day')))
  })

  it('하루에 두 번 굴릴 수 없다', async () => {
    const ref = rollDoc(dbAs('alice'), 'alice', todayRollId())
    await assertSucceeds(setDoc(ref, newRoll('day')))
    await assertFails(setDoc(ref, newRoll('day')))
  })

  it('처음부터 받은 것으로 만들 수 없다', async () => {
    await assertFails(setDoc(rollDoc(dbAs('alice'), 'alice', todayRollId()), { ...newRoll('day'), claimed: true }))
  })

  it('남의 주사위는 굴릴 수 없고, 대기자도 굴릴 수 없다', async () => {
    await assertFails(setDoc(rollDoc(dbAs('bob'), 'alice', todayRollId()), newRoll('day')))
    await assertFails(setDoc(rollDoc(dbAs('waiting'), 'waiting', todayRollId()), newRoll('day')))
  })

  it('출석으로 인정된 모임마다 한 번 굴릴 수 있다', async () => {
    await assertSucceeds(setDoc(rollDoc(dbAs('alice'), 'alice', 'event-past'), newRoll('event', 'past')))
  })

  it('출석 인정이 안 되는 모임으로는 굴릴 수 없다', async () => {
    const roll = (id: string) => setDoc(rollDoc(dbAs('alice'), 'alice', `event-${id}`), newRoll('event', id))
    await assertFails(roll('future'))
    await assertFails(roll('canceled'))
    await assertFails(roll('checked'))
    await assertFails(roll('others'))
    await assertFails(roll('ghost'))
  })

  it('문서 id 와 모임이 다르면 안 된다', async () => {
    await assertFails(setDoc(rollDoc(dbAs('alice'), 'alice', 'event-others'), newRoll('event', 'past')))
  })

  it('굴림 기록은 지울 수 없고, 남의 기록은 볼 수 없다', async () => {
    await setDoc(rollDoc(dbAs('alice'), 'alice', todayRollId()), newRoll('day'))
    await assertFails(deleteDoc(rollDoc(dbAs('alice'), 'alice', todayRollId())))
    await assertFails(getDoc(rollDoc(dbAs('bob'), 'alice', todayRollId())))
    await assertSucceeds(getDoc(rollDoc(dbAs('owner', ownerAuth), 'alice', todayRollId())))
  })
})

describe('보상 받기', () => {
  it('서버 시각으로 정해진 코인과 경험치 2를 받는다', async () => {
    const id = todayRollId()
    await setDoc(rollDoc(dbAs('alice'), 'alice', id), newRoll('day'))
    const coins = await rewardOf('alice', id, 'day')
    expect(coins).toBeGreaterThanOrEqual(1)
    expect(coins).toBeLessThanOrEqual(6)
    await assertSucceeds(claim('alice', id, { diceXp: 2, coins }))
  })

  it('출석 주사위는 두 개의 합(2~12)을 받는다', async () => {
    await setDoc(rollDoc(dbAs('alice'), 'alice', 'event-past'), newRoll('event', 'past'))
    const coins = await rewardOf('alice', 'event-past', 'event')
    expect(coins).toBeGreaterThanOrEqual(2)
    expect(coins).toBeLessThanOrEqual(12)
    await assertSucceeds(claim('alice', 'event-past', { diceXp: 2, coins }))
  })

  it('계산과 다른 코인이나 경험치는 받을 수 없다', async () => {
    const id = todayRollId()
    await setDoc(rollDoc(dbAs('alice'), 'alice', id), newRoll('day'))
    const coins = await rewardOf('alice', id, 'day')
    await assertFails(claim('alice', id, { diceXp: 2, coins: coins + 1 }))
    await assertFails(claim('alice', id, { diceXp: 10, coins }))
  })

  it('같은 굴림으로 두 번 받을 수 없다', async () => {
    const id = todayRollId()
    await setDoc(rollDoc(dbAs('alice'), 'alice', id), newRoll('day'))
    const coins = await rewardOf('alice', id, 'day')
    await assertSucceeds(claim('alice', id, { diceXp: 2, coins }))
    await assertFails(claim('alice', id, { diceXp: 4, coins: coins * 2 }))
  })

  it('굴림 없이 코인만 올리거나, 받기 표시만 바꿀 수 없다', async () => {
    await assertFails(updateDoc(doc(dbAs('alice'), 'users', 'alice'), { coins: 100 }))
    await assertFails(updateDoc(doc(dbAs('alice'), 'users', 'alice'), { diceXp: 2, coins: 3, lastRollId: 'day-19990101' }))
    const id = todayRollId()
    await setDoc(rollDoc(dbAs('alice'), 'alice', id), newRoll('day'))
    await assertFails(updateDoc(rollDoc(dbAs('alice'), 'alice', id), { claimed: true }))
  })

  it('남의 보상은 받을 수 없다', async () => {
    const id = todayRollId()
    await setDoc(rollDoc(dbAs('alice'), 'alice', id), newRoll('day'))
    const coins = await rewardOf('alice', id, 'day')
    const db = dbAs('bob')
    const batch = writeBatch(db)
    batch.update(rollDoc(db, 'alice', id), { claimed: true })
    batch.update(doc(db, 'users', 'alice'), { diceXp: 2, coins, lastRollId: id })
    await assertFails(batch.commit())
  })
})
