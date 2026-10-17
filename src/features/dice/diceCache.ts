import { todayRollId } from '@/data/dice'

/**
 * 홈에서 "굴릴 주사위가 있는지"를 읽기 없이(또는 1번으로) 알기 위한 기기 저장값.
 * - 오늘의 주사위를 굴린 날짜
 * - 지금까지 굴린 출석 주사위 수 (출석 횟수가 이보다 많으면 굴릴 게 남은 것)
 * 틀려도 반짝임 표시가 잠깐 틀릴 뿐이고, 주사위 화면을 열면 서버 값으로 다시 맞춘다
 */

const todayKey = (uid: string) => `dice:today:${uid}`
const eventKey = (uid: string) => `dice:eventRolls:${uid}`

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장 못 해도 다음에 한 번 더 읽을 뿐이다
  }
}

/** 오늘의 주사위를 굴렸다고 기기에 적혀 있는지 */
export const cachedTodayRolled = (uid: string) => read(todayKey(uid)) === todayRollId()
export const markTodayRolled = (uid: string) => write(todayKey(uid), todayRollId())

export const cachedEventRollCount = (uid: string) => Number(read(eventKey(uid)) ?? 0) || 0
export const saveEventRollCount = (uid: string, count: number) => write(eventKey(uid), String(count))
