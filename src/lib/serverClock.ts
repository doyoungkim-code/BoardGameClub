import { doc, getDocFromServer, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * 서버 시각 맞추기. 폰마다 시계가 조금씩 달라서, 모두가 같은 순간에 같은 밤 단계를 보려면 서버 시각이 기준이어야 한다.
 * clockPings/{uid} 에 서버 시각을 쓰고(왕복 시간의 가운데를 그 순간으로 본다) 다시 읽어 차이를 잰다.
 */
let offset = 0
let synced: Promise<void> | null = null

export function syncServerClock(uid: string) {
  synced ??= (async () => {
    const ref = doc(db, 'clockPings', uid)
    const sent = Date.now()
    await setDoc(ref, { at: serverTimestamp() })
    const acked = Date.now()
    const snap = await getDocFromServer(ref)
    const at = snap.get('at') as Timestamp | undefined
    if (at) offset = at.toMillis() - (sent + acked) / 2
  })().catch((error) => {
    // 실패하면 다음에 다시 잰다 (그동안은 폰 시계 그대로)
    synced = null
    throw error
  })
  return synced
}

/** 서버 기준 지금 시각(ms) */
export const serverNow = () => Date.now() + offset
