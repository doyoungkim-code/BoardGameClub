import { ATTENDANCE_ACHIEVEMENTS, tierFor, xpFor } from '@/data/achievements'
import type { Progress } from '@/services/activity'

/**
 * 본인 프로필의 "NEW" 표시용. 지난번에 프로필에서 본 업적·칭호·티어를 기기에 저장해 두고,
 * 그 뒤로 새로 생긴 것에 NEW 를 붙인다 (기기마다 따로. 알림 대신 가볍게).
 * 키 모양: 'ach:<출석 횟수>', 'title:<칭호 값>', 'tier:<티어 id>'
 */

const storageKey = (uid: string) => `seenProgress:${uid}`

export function readSeen(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function writeSeen(uid: string, keys: string[]) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(keys))
  } catch {
    // 저장 못 하면 다음에도 NEW 가 보일 뿐이다
  }
}

/** 지금 가진 것 전부를 키로 (titleKeys: 가진 칭호 값 'auto:…' / 'granted:…') */
export function progressKeys(progress: Pick<Progress, 'unlockedGoals' | 'tier'>, titleKeys: string[]) {
  return [
    ...progress.unlockedGoals.map((goal) => `ach:${goal}`),
    ...titleKeys.map((key) => `title:${key}`),
    `tier:${progress.tier.id}`,
  ]
}

/**
 * 출석 횟수만으로 볼 수 있는 새 업적·티어가 있는지 (내 정보 화면의 점 표시용).
 * 칭호는 게시글 등 다른 기록이 필요해서 여기서는 보지 않는다
 */
export function hasUnseenAttendanceProgress(uid: string, attended: number) {
  const seen = readSeen(uid)
  const xp = xpFor(attended)
  const keys = [
    ...ATTENDANCE_ACHIEVEMENTS.filter((a) => attended >= a.goal).map((a) => `ach:${a.goal}`),
    `tier:${tierFor(xp).id}`,
  ]
  return keys.some((key) => !seen.has(key))
}
