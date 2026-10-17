/**
 * 도트 장면용 색. 캔버스는 CSS 변수를 못 쓰므로 앱 토큰(src/index.css)과 비슷한 원목 톤을 hex 로 고정해 둔다.
 * 앱 색을 크게 바꾸면 여기도 같이 맞춘다.
 */
export const PAL = {
  outline: '#2a1d14',
  wallDark: '#5a3826',
  wall: '#6e452f',
  wallLight: '#7d5038',
  woodDark: '#3b2a1e',
  wood: '#6b4226',
  woodLight: '#8a5a34',
  tableTop: '#a5703f',
  tableTopLight: '#bb8550',
  tableEdge: '#5a3720',
  cream: '#fbf8f1',
  creamDark: '#e9dcc2',
  copper: '#b45309',
  copperDark: '#78350f',
  lampShade: '#2f5d50',
  lampShadeLight: '#3f7a69',
  lampLight: '#ffe6a3',
  bulb: '#fff6cf',
  coffee: '#4a2c1a',
  steam: '#f5efe4',
  boardA: '#e9d5a6',
  boardB: '#c79c5e',
  boardEdge: '#7a4b2a',
  cat: '#2d2d34',
  catLight: '#4a4a55',
  catEye: '#f2c94c',
  sparkle: '#ffe066',
  meeples: ['#d64545', '#3b6fd6', '#e0b02c', '#3f9b5a'],
  boxes: ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22'],
} as const

/** 창밖 하늘: 위에서 아래로 색 띠 (디더링으로 섞는다) */
export const SKY = {
  night: ['#0b1026', '#121a3d', '#1c2656', '#2a3670'],
  dawn: ['#2d2a5a', '#6b4a8a', '#d4789a', '#f7b98a'],
  day: ['#4a90d9', '#6aaee8', '#8fc6f0', '#b9dcf5'],
  sunset: ['#2b1e4a', '#6b2f5f', '#c2456b', '#f08a4b', '#ffcf6b'],
} as const

export type SkyTime = keyof typeof SKY

/** 지금 시각(기기 시계)으로 하늘 고르기 */
export function skyTimeOf(date: Date): SkyTime {
  const h = date.getHours() + date.getMinutes() / 60
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 17) return 'day'
  if (h >= 17 && h < 19.5) return 'sunset'
  return 'night'
}
