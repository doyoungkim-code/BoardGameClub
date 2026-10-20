import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { createTestEnv, seedDoc, seedUser } from './helpers.ts'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createTestEnv()
})

afterAll(async () => {
  await env.cleanup()
})

const dbAs = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@example.com`, email_verified: true }).firestore()

const ROOM = 'wolfRooms/main'
const GAME = 'wolfRooms/main/games/g1'
const ROLES = ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager']

/** 앱이 처음 들어올 때 만드는 방 (services/wolf.ts 와 같은 모양) */
const newRoom = (uid: string, overrides: Record<string, unknown> = {}) => ({
  hostId: uid,
  seats: [uid],
  readyIds: [],
  status: 'lobby',
  roles: ROLES,
  stepSec: 10,
  discussSec: 300,
  gameId: null,
  updatedAt: serverTimestamp(),
  ...overrides,
})

const seedRoom = (overrides: Record<string, unknown> = {}) =>
  seedDoc(env, ROOM, { ...newRoom('alice'), seats: ['alice', 'bob', 'carol'], updatedAt: Timestamp.now(), ...overrides })

const newGame = (overrides: Record<string, unknown> = {}) => ({
  hostId: 'alice',
  players: ['alice', 'bob', 'carol'],
  roles: ROLES,
  steps: [{ id: 'werewolf', units: 1 }],
  stepSec: 10,
  discussSec: 300,
  phase: 'deal',
  startedAt: null,
  dayEndAt: null,
  voteEndAt: null,
  readyIds: [],
  result: null,
  createdAt: serverTimestamp(),
  ...overrides,
})

const seedGame = (overrides: Record<string, unknown> = {}) =>
  seedDoc(env, GAME, { ...newGame(), createdAt: Timestamp.now(), ...overrides })

const now = () => serverTimestamp()

beforeEach(async () => {
  await env.clearFirestore()
  for (const uid of ['alice', 'bob', 'carol', 'dave']) await seedUser(env, uid, { status: 'approved' })
  await seedUser(env, 'waiting', { status: 'pending' })
})

describe('방 만들기·들어가기·나가기', () => {
  it('회원은 방을 만들고 방장이 된다. 대기자나 남을 방장으로는 안 된다', async () => {
    await assertFails(setDoc(doc(dbAs('waiting'), ROOM), newRoom('waiting')))
    await assertFails(setDoc(doc(dbAs('bob'), ROOM), newRoom('alice')))
    await assertFails(setDoc(doc(dbAs('bob'), 'wolfRooms/other'), newRoom('bob')))
    await assertSucceeds(setDoc(doc(dbAs('bob'), ROOM), newRoom('bob')))
  })

  it('대기 중인 방에 나만 맨 뒤에 들어간다', async () => {
    await seedRoom()
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { seats: ['alice', 'bob', 'carol', 'waiting'], updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { seats: ['dave', 'alice', 'bob', 'carol'], updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(dbAs('dave'), ROOM), { seats: ['alice', 'bob', 'carol', 'dave'], updatedAt: now() }))
  })

  it('이미 들어와 있거나, 판이 진행 중이거나, 10명이 차면 못 들어간다', async () => {
    await seedRoom()
    await assertFails(updateDoc(doc(dbAs('bob'), ROOM), { seats: ['alice', 'bob', 'carol', 'bob'], updatedAt: now() }))
    await seedRoom({ status: 'playing', gameId: 'g1' })
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { seats: ['alice', 'bob', 'carol', 'dave'], updatedAt: now() }))
    const ten = Array.from({ length: 10 }, (_, i) => `u${i}`)
    await seedRoom({ seats: ten })
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { seats: [...ten, 'dave'], updatedAt: now() }))
  })

  it('방장이 없으면 들어오는 사람이 방장이 된다. 있으면 못 가로챈다', async () => {
    await seedRoom()
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { seats: ['alice', 'bob', 'carol', 'dave'], hostId: 'dave', updatedAt: now() }))
    await seedRoom({ hostId: null, seats: [] })
    await assertSucceeds(updateDoc(doc(dbAs('dave'), ROOM), { seats: ['dave'], hostId: 'dave', updatedAt: now() }))
  })

  it('나가면 나만 빠지고, 방장이 나가면 남은 첫 사람이 방장', async () => {
    await seedRoom({ readyIds: ['bob'] })
    await assertFails(updateDoc(doc(dbAs('bob'), ROOM), { seats: ['alice'], readyIds: [], updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(dbAs('bob'), ROOM), { seats: ['alice', 'carol'], readyIds: [], updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('alice'), ROOM), { seats: ['carol'], updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), ROOM), { seats: ['carol'], hostId: 'carol', updatedAt: now() }))
  })

  it('준비는 나만 켜고 끈다', async () => {
    await seedRoom()
    await assertSucceeds(updateDoc(doc(dbAs('bob'), ROOM), { readyIds: ['bob'], updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('bob'), ROOM), { readyIds: ['bob', 'carol'], updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(dbAs('bob'), ROOM), { readyIds: [], updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { readyIds: ['dave'], updatedAt: now() }))
  })

  it('구성·시간·시작은 방장만', async () => {
    await seedRoom()
    await assertFails(updateDoc(doc(dbAs('bob'), ROOM), { stepSec: 20, updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), ROOM), { stepSec: 20, discussSec: 180, updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('alice'), ROOM), { stepSec: 99, updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('alice'), ROOM), { roles: ['werewolf', 'king'], updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('alice'), ROOM), { status: 'playing', updatedAt: now() }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), ROOM), { status: 'playing', gameId: 'g1', updatedAt: now() }))
  })

  it('방장은 사람을 내보낼 수 있지만 남을 넣을 수는 없다', async () => {
    await seedRoom()
    await assertSucceeds(updateDoc(doc(dbAs('alice'), ROOM), { seats: ['alice', 'bob'], updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('alice'), ROOM), { seats: ['alice', 'bob', 'dave'], updatedAt: now() }))
  })

  it('대기 중에는 방에 있는 사람이 방장을 넘겨받을 수 있다', async () => {
    await seedRoom()
    await assertSucceeds(updateDoc(doc(dbAs('bob'), ROOM), { hostId: 'bob', updatedAt: now() }))
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { hostId: 'dave', updatedAt: now() }))
    await seedRoom({ status: 'playing', gameId: 'g1' })
    await assertFails(updateDoc(doc(dbAs('bob'), ROOM), { hostId: 'bob', updatedAt: now() }))
  })

  it('판 도중 방에 있는 사람은 방을 대기로 되돌릴 수 있다', async () => {
    await seedRoom({ status: 'playing', gameId: 'g1' })
    await assertSucceeds(updateDoc(doc(dbAs('bob'), ROOM), { status: 'lobby', gameId: null, readyIds: [], hostId: 'bob', updatedAt: now() }))
    await seedRoom({ status: 'playing', gameId: 'g1' })
    await assertFails(updateDoc(doc(dbAs('dave'), ROOM), { status: 'lobby', gameId: null, readyIds: [], hostId: 'dave', updatedAt: now() }))
  })
})

describe('판', () => {
  it('방장만 판을 만든다', async () => {
    await seedRoom()
    await assertFails(setDoc(doc(dbAs('bob'), GAME), newGame({ hostId: 'bob' })))
    await assertFails(setDoc(doc(dbAs('alice'), GAME), newGame({ phase: 'night' })))
    await assertFails(setDoc(doc(dbAs('alice'), GAME), newGame({ roles: ['werewolf'] })))
    await assertSucceeds(setDoc(doc(dbAs('alice'), GAME), newGame()))
  })

  it('판 진행은 방장만, 낮의 "토론 끝"은 본인만 추가', async () => {
    await seedRoom()
    await seedGame({ phase: 'day' })
    await assertFails(updateDoc(doc(dbAs('bob'), GAME), { phase: 'vote' }))
    await assertSucceeds(updateDoc(doc(dbAs('alice'), GAME), { phase: 'day', dayEndAt: Timestamp.now() }))
    await assertSucceeds(updateDoc(doc(dbAs('bob'), GAME), { readyIds: ['bob'] }))
    await assertFails(updateDoc(doc(dbAs('bob'), GAME), { readyIds: ['bob', 'carol'] }))
    await assertFails(updateDoc(doc(dbAs('dave'), GAME), { readyIds: ['bob', 'dave'] }))
    await assertFails(updateDoc(doc(dbAs('alice'), GAME), { players: ['alice', 'bob', 'dave'] }))
  })

  it('처음 카드(private)는 본인과 방장만 읽고, 방장만 쓴다', async () => {
    await seedRoom()
    await seedGame()
    const priv = { seat: 1, dealt: 'werewolf', info: [] }
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/private/bob`), priv))
    await assertSucceeds(setDoc(doc(dbAs('alice'), `${GAME}/private/bob`), priv))
    await assertFails(setDoc(doc(dbAs('alice'), `${GAME}/private/dave`), priv))
    await assertSucceeds(getDoc(doc(dbAs('bob'), `${GAME}/private/bob`)))
    await assertSucceeds(getDoc(doc(dbAs('alice'), `${GAME}/private/bob`)))
    await assertFails(getDoc(doc(dbAs('carol'), `${GAME}/private/bob`)))
  })

  it('밤 행동은 본인이 밤에만, 본인과 방장만 읽는다', async () => {
    await seedRoom()
    await seedGame({ phase: 'night' })
    const action = (uid: string, kind = 'seer') => ({ uid, kind, targets: [2], at: now() })
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/actions/carol_seer`), action('carol')))
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/actions/bob_robber`), action('bob')))
    await assertFails(setDoc(doc(dbAs('dave'), `${GAME}/actions/dave_seer`), action('dave')))
    await assertSucceeds(setDoc(doc(dbAs('bob'), `${GAME}/actions/bob_seer`), action('bob')))
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/actions/bob_seer`), action('bob')))
    await assertSucceeds(getDoc(doc(dbAs('bob'), `${GAME}/actions/bob_seer`)))
    await assertSucceeds(getDoc(doc(dbAs('alice'), `${GAME}/actions/bob_seer`)))
    await assertFails(getDoc(doc(dbAs('carol'), `${GAME}/actions/bob_seer`)))
    await seedGame({ phase: 'day' })
    await assertFails(setDoc(doc(dbAs('carol'), `${GAME}/actions/carol_seer`), action('carol')))
  })

  it('투표는 본인이 투표 시간에만, 결과가 나오면 모두 읽는다', async () => {
    await seedRoom()
    await seedGame({ phase: 'night' })
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/votes/bob`), { target: 'carol', at: now() }))
    await seedGame({ phase: 'vote' })
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/votes/bob`), { target: 'bob', at: now() }))
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/votes/bob`), { target: 'dave', at: now() }))
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/votes/carol`), { target: 'alice', at: now() }))
    await assertSucceeds(setDoc(doc(dbAs('bob'), `${GAME}/votes/bob`), { target: 'carol', at: now() }))
    await assertFails(getDoc(doc(dbAs('carol'), `${GAME}/votes/bob`)))
    await assertSucceeds(getDoc(doc(dbAs('alice'), `${GAME}/votes/bob`)))
    await seedGame({ phase: 'result', result: { winnerIds: [] } })
    await assertSucceeds(getDoc(doc(dbAs('carol'), `${GAME}/votes/bob`)))
  })

  it('딜러 계산 상태(secret)는 방장만', async () => {
    await seedRoom()
    await seedGame()
    await assertSucceeds(setDoc(doc(dbAs('alice'), `${GAME}/secret/state`), { cards: [] }))
    await assertFails(getDoc(doc(dbAs('bob'), `${GAME}/secret/state`)))
    await assertFails(setDoc(doc(dbAs('bob'), `${GAME}/secret/state`), { cards: [] }))
  })
})

describe('방장 시작·진행 (services/wolf.ts 와 같은 순서)', () => {
  it('10명 판: 판 문서 → 처음 카드 10장 + 딜러 상태 + 판 시작 + 방 상태를 한 번에', async () => {
    const ten = ['alice', 'bob', 'carol', 'dave', ...Array.from({ length: 6 }, (_, i) => `m${i}`)]
    for (const uid of ten.slice(4)) await seedUser(env, uid, { status: 'approved' })
    const roles = [...ROLES, 'villager', 'villager', 'minion', 'drunk', 'insomniac', 'tanner', 'hunter']
    await seedRoom({ seats: ten, roles })
    const db = dbAs('alice')
    await assertSucceeds(setDoc(doc(db, GAME), newGame({ players: ten, roles })))
    const batch = writeBatch(db)
    ten.forEach((uid, seat) => batch.set(doc(db, `${GAME}/private/${uid}`), { seat, dealt: 'villager', info: [] }))
    batch.set(doc(db, `${GAME}/secret/state`), { state: { n: 10 }, startedSteps: 0, processed: [] })
    batch.update(doc(db, GAME), { phase: 'night', startedAt: serverTimestamp() })
    batch.update(doc(db, ROOM), { status: 'playing', gameId: 'g1', readyIds: [], updatedAt: serverTimestamp() })
    await assertSucceeds(batch.commit())
    // 밤에 알게 된 것 더하기
    await assertSucceeds(
      updateDoc(doc(db, `${GAME}/private/bob`), { info: arrayUnion({ kind: 'wolves', step: 'werewolf', seats: [2] }) }),
    )
    // 결과 공개 후 대기실로
    await assertSucceeds(updateDoc(doc(db, GAME), { phase: 'result', result: { winnerIds: ['bob'] } }))
    await assertSucceeds(updateDoc(doc(db, ROOM), { status: 'lobby', gameId: null, readyIds: [], updatedAt: serverTimestamp() }))
  })
})

describe('전적·서버 시각', () => {
  it('결과가 나온 판만, 이겼는지는 결과와 같게 본인이 남긴다', async () => {
    await seedRoom()
    await seedGame({ phase: 'vote' })
    const rec = (won: boolean) => ({ role: 'seer', won, playedAt: now() })
    await assertFails(setDoc(doc(dbAs('bob'), 'users/bob/wolfGames/g1'), rec(true)))
    await seedGame({ phase: 'result', result: { winnerIds: ['bob'] } })
    await assertFails(setDoc(doc(dbAs('bob'), 'users/bob/wolfGames/g1'), rec(false)))
    await assertFails(setDoc(doc(dbAs('carol'), 'users/bob/wolfGames/g1'), rec(true)))
    await assertSucceeds(setDoc(doc(dbAs('bob'), 'users/bob/wolfGames/g1'), rec(true)))
    await assertFails(updateDoc(doc(dbAs('bob'), 'users/bob/wolfGames/g1'), { won: false }))
    await assertSucceeds(setDoc(doc(dbAs('carol'), 'users/carol/wolfGames/g1'), rec(false)))
    await assertFails(setDoc(doc(dbAs('dave'), 'users/dave/wolfGames/g1'), rec(false)))
    await assertSucceeds(getDoc(doc(dbAs('dave'), 'users/bob/wolfGames/g1')))
  })

  it('clockPings 는 본인만, 서버 시각으로만', async () => {
    await assertSucceeds(setDoc(doc(dbAs('bob'), 'clockPings/bob'), { at: now() }))
    await assertFails(setDoc(doc(dbAs('bob'), 'clockPings/bob'), { at: Timestamp.now() }))
    await assertFails(setDoc(doc(dbAs('bob'), 'clockPings/carol'), { at: now() }))
    await assertSucceeds(getDoc(doc(dbAs('bob'), 'clockPings/bob')))
    await assertFails(getDoc(doc(dbAs('carol'), 'clockPings/bob')))
  })
})
