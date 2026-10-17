import { useEffect, useState } from 'react'
import { cachedEventRollCount, cachedTodayRolled, markTodayRolled } from '@/features/dice/diceCache'
import { fetchTodayRolled } from '@/services/dice'
import { useProgress } from '@/stores/progress'

/**
 * 굴릴 주사위가 있는지 (홈 카페 장면의 주사위 반짝임).
 * 오늘의 주사위: 기기에 오늘 굴렸다고 적혀 있으면 읽지 않고, 아니면 1번만 확인한다.
 * 출석 주사위: 출석 횟수(이미 받아 둔 값) > 기기에 적힌 굴린 횟수 이면 남은 것으로 본다
 */
export function useDiceReady(uid: string) {
  const attended = useProgress((s) => s.attendedById[uid] ?? 0)
  const [todayRolled, setTodayRolled] = useState<boolean | null>(() => (cachedTodayRolled(uid) ? true : null))

  useEffect(() => {
    if (todayRolled !== null) return
    let canceled = false
    fetchTodayRolled(uid)
      .then((rolled) => {
        if (rolled) markTodayRolled(uid)
        if (!canceled) setTodayRolled(rolled)
      })
      .catch(() => {
        // 못 읽으면 반짝이지 않는다
        if (!canceled) setTodayRolled(true)
      })
    return () => {
      canceled = true
    }
  }, [uid, todayRolled])

  return todayRolled === false || attended > cachedEventRollCount(uid)
}
