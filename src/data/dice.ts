/**
 * 주사위 게임 숫자와 계산식. **firestore.rules 의 '주사위' 부분과 같은 식이어야 한다** (규칙이 같은 계산으로 검사한다).
 *
 * - 굴릴 기회: 하루 첫 접속 1번(주사위 1개) + 출석으로 인정된 모임마다 1번(주사위 2개). 지난 출석도 모두
 * - 보상: 굴릴 때마다 경험치 DICE_XP 고정 + 코인 = 나온 눈의 합
 * - 눈은 서버가 굴림 문서에 기록한 시각(밀리초)으로 정해진다 → 조작할 수 없다
 */

/** 굴릴 때마다 받는 경험치 */
export const DICE_XP = 2

export type RollKind = 'day' | 'event'

/** 기회마다 굴리는 주사위 개수 */
export const diceCount = (kind: RollKind) => (kind === 'day' ? 1 : 2)

/**
 * 서버 시각(밀리초) → 주사위 눈. 주사위1 = ms % 6 + 1, 주사위2 = (ms / 6 의 몫) % 6 + 1.
 * Firestore Timestamp.toMillis() 는 소수점 아래(마이크로초)까지 주므로 내림해서 규칙과 맞춘다
 */
export function diceFaces(rolledAtMs: number, kind: RollKind): number[] {
  const ms = Math.floor(rolledAtMs)
  const faces = [(ms % 6) + 1]
  if (diceCount(kind) === 2) faces.push((Math.floor(ms / 6) % 6) + 1)
  return faces
}

/** 받는 코인 = 눈의 합 */
export const coinsOf = (faces: number[]) => faces.reduce((sum, face) => sum + face, 0)

/** 오늘(한국 시각) 매일 주사위 문서 id: day-YYYYMMDD. 규칙의 todayRollId() 와 같다 */
export function todayRollId(now = new Date()) {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return `day-${ymd.replaceAll('-', '')}`
}

/** 출석 주사위 문서 id */
export const eventRollId = (eventId: string) => `event-${eventId}`
