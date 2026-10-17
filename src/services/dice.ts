import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore'
import { coinsOf, DICE_XP, diceFaces, eventRollId, todayRollId, type RollKind } from '@/data/dice'
import { db } from '@/lib/firebase'
import { countsAsAttended } from '@/services/activity'
import { eventsCol, toEvent } from '@/services/events'
import type { ClubEvent } from '@/types/event'

/**
 * 주사위 게임 (규칙: firestore.rules 의 '주사위', 숫자: src/data/dice.ts).
 * 굴리는 순간에는 서버 시각을 모르므로 두 번에 나눈다: ① 굴림 문서 만들기(서버 시각 기록) ② 다시 읽어 눈을 계산하고 보상 받기
 */

/** users/{uid}/rolls/{rollId} */
export type Roll = {
  id: string
  kind: RollKind
  eventId: string | null
  rolledAt: Timestamp | null
  /** 보상(경험치·코인)을 받았는지 */
  claimed: boolean
}

export type RollResult = { rollId: string; kind: RollKind; faces: number[]; coins: number; xp: number }

const rollsCol = (uid: string) => collection(db, 'users', uid, 'rolls')
const rollRef = (uid: string, rollId: string) => doc(rollsCol(uid), rollId)
const toRoll = (snap: DocumentSnapshot) => ({ id: snap.id, ...snap.data() }) as Roll

/** 굴린 기록 → 눈 (서버 시각이 아직 없으면 null) */
export const facesOf = (roll: Roll) => (roll.rolledAt ? diceFaces(roll.rolledAt.toMillis(), roll.kind) : null)

/** 굴리기 + 보상 받기. 오늘의 주사위면 eventId 없이 */
export async function rollDice(uid: string, kind: RollKind, eventId: string | null = null): Promise<RollResult> {
  // 오프라인이면 쓰기가 서버에 닿을 때까지 기다리게 되므로 미리 막는다 (서버 시각이 있어야 눈이 정해진다)
  if (!navigator.onLine) throw new Error('offline')
  const rollId = kind === 'day' ? todayRollId() : eventRollId(eventId!)
  await setDoc(rollRef(uid, rollId), { kind, eventId, rolledAt: serverTimestamp(), claimed: false })
  return claimRoll(uid, rollId)
}

/**
 * 굴린 기록을 서버에서 다시 읽어 눈을 계산하고, 아직 안 받았으면 보상을 받는다.
 * 받는 도중 끊겼던 굴림도 이걸로 마저 받는다 (규칙이 한 번만 받게 막는다)
 */
export async function claimRoll(uid: string, rollId: string): Promise<RollResult> {
  const roll = toRoll(await getDocFromServer(rollRef(uid, rollId)))
  const faces = facesOf(roll)
  if (!faces) throw new Error('rolledAt missing')
  const coins = coinsOf(faces)
  if (!roll.claimed) {
    const batch = writeBatch(db)
    batch.update(rollRef(uid, rollId), { claimed: true })
    // increment: 규칙은 '이전 값 + 정해진 양'인지 검사한다 (src/data/dice.ts 의 DICE_XP, 눈의 합)
    batch.update(doc(db, 'users', uid), { diceXp: increment(DICE_XP), coins: increment(coins), lastRollId: rollId })
    await batch.commit()
  }
  return { rollId, kind: roll.kind, faces, coins, xp: DICE_XP }
}

export type DiceStatus = {
  /** 오늘의 주사위를 이미 굴렸는지 */
  todayRolled: boolean
  /** 아직 안 굴린 출석 주사위 (오래된 모임부터) */
  pendingEvents: ClubEvent[]
  /** 굴렸지만 보상을 못 받은 것 (도중에 끊긴 경우) */
  unclaimed: Roll[]
  /** 최근 굴림 10개 */
  recent: Roll[]
  /** 지금까지 굴린 출석 주사위 수 (홈 반짝임 계산용) */
  eventRollCount: number
}

/**
 * 주사위 화면을 열 때만 읽는다: 오늘 기록 1 + 내 출석 주사위 기록 + 내가 참석한 모임 + 최근 10 + 못 받은 것
 * (모두 한 필드 조건이거나 정렬 하나라 복합 색인이 필요 없다)
 */
export async function fetchDiceStatus(uid: string): Promise<DiceStatus> {
  const [todaySnap, eventRollsSnap, attendSnap, recentSnap, unclaimedSnap] = await Promise.all([
    getDoc(rollRef(uid, todayRollId())),
    getDocs(query(rollsCol(uid), where('kind', '==', 'event'))),
    getDocs(query(eventsCol, where('attendeeIds', 'array-contains', uid))),
    getDocs(query(rollsCol(uid), orderBy('rolledAt', 'desc'), limit(10))),
    getDocs(query(rollsCol(uid), where('claimed', '==', false))),
  ])
  const rolled = new Set(eventRollsSnap.docs.map((d) => d.get('eventId') as string))
  const pendingEvents = attendSnap.docs
    .map(toEvent)
    .filter((event) => countsAsAttended(event, uid) && !rolled.has(event.id))
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())
  return {
    todayRolled: todaySnap.exists(),
    pendingEvents,
    unclaimed: unclaimedSnap.docs.map(toRoll),
    recent: recentSnap.docs.map(toRoll),
    eventRollCount: rolled.size,
  }
}

/** 오늘의 주사위만 확인 (홈에서 1회 읽기) */
export async function fetchTodayRolled(uid: string) {
  return (await getDoc(rollRef(uid, todayRollId()))).exists()
}
