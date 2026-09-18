import { getDocs } from 'firebase/firestore'
import { create } from 'zustand'
import { tierFor, xpFor, type Tier } from '@/data/achievements'
import { countsAsAttended } from '@/services/activity'
import { eventsCol, toEvent } from '@/services/events'

/**
 * 모든 회원의 출석 횟수 → 티어. 채팅·게시판·회원 목록 등 닉네임 옆 티어 표시에 쓴다.
 *
 * 티어는 출석만으로 정해지므로 모임(events) 전체만 있으면 된다. 다만 무료 한도(읽기 5만/일) 때문에
 * 앱을 열 때마다 전체를 읽지 않고, 계산한 출석 횟수를 기기에 저장해 두고 **6시간에 한 번만** 다시 읽는다.
 * 그래서 다른 회원의 티어는 최대 6시간 늦게 반영될 수 있다 (본인 프로필은 열 때 항상 새로 계산).
 */

type ProgressState = {
  loaded: boolean
  /** uid → 출석 횟수 */
  attendedById: Record<string, number>
}

export const useProgress = create<ProgressState>(() => ({ loaded: false, attendedById: {} }))

const CACHE_KEY = 'attendanceCounts:v1'
const MAX_AGE = 6 * 60 * 60 * 1000

type Cache = { savedAt: number; attendedById: Record<string, number> }

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Cache) : null
  } catch {
    return null
  }
}

function writeCache(attendedById: Record<string, number>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), attendedById } satisfies Cache))
  } catch {
    // 저장 못 해도 이번 실행에서는 쓸 수 있다
  }
}

let refreshing: Promise<void> | null = null

/** 모임 전체를 읽어 모든 회원의 출석 횟수를 다시 센다 */
export function refreshProgress() {
  if (refreshing) return refreshing
  refreshing = getDocs(eventsCol)
    .then((snap) => {
      const attendedById: Record<string, number> = {}
      for (const event of snap.docs.map(toEvent)) {
        for (const uid of event.attendeeIds) {
          if (countsAsAttended(event, uid)) attendedById[uid] = (attendedById[uid] ?? 0) + 1
        }
      }
      writeCache(attendedById)
      useProgress.setState({ loaded: true, attendedById })
    })
    .catch((error) => {
      console.error('티어 계산용 모임 불러오기 실패', error)
      useProgress.setState({ loaded: true })
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined

/**
 * 참석자·출석 체크를 바꾼 직후 부른다. 연달아 체크할 때 매번 읽지 않도록 잠깐 모았다가 한 번만 다시 센다
 */
export function scheduleProgressRefresh() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => void refreshProgress(), 3000)
}

/** 앱 시작 때 한 번 (AppShell). 저장해 둔 값을 먼저 쓰고, 오래됐으면 새로 센다 */
export function startProgressSync() {
  const cache = readCache()
  if (cache) useProgress.setState({ loaded: true, attendedById: cache.attendedById })
  if (!cache || Date.now() - cache.savedAt > MAX_AGE) void refreshProgress()
}

export function stopProgressSync() {
  clearTimeout(refreshTimer)
  useProgress.setState({ loaded: false, attendedById: {} })
}

/** 한 회원의 경험치·티어 (아직 모르면 null) */
export function useMemberTier(uid: string | undefined): { xp: number; tier: Tier } | null {
  const loaded = useProgress((s) => s.loaded)
  const attended = useProgress((s) => (uid ? (s.attendedById[uid] ?? 0) : 0))
  if (!loaded || !uid) return null
  const xp = xpFor(attended)
  return { xp, tier: tierFor(xp) }
}
