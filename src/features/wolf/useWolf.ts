import { useEffect, useRef, useState } from 'react'
import { serverNow, syncServerClock } from '@/lib/serverClock'
import { runWolfHost } from '@/features/wolf/hostRunner'
import { saveRecord, subscribeGame, subscribePrivate, subscribeRoom } from '@/services/wolf'
import type { WolfGame, WolfPrivate, WolfRoom } from '@/types/wolf'

/** 방·판·내 카드 구독 + 서버 시각 맞추기 + (내가 방장이면) 자동 딜러 */
export function useWolf(uid: string) {
  const [room, setRoom] = useState<{ value: WolfRoom | null } | null>(null)
  const [game, setGame] = useState<WolfGame | null>(null)
  const [priv, setPriv] = useState<{ gameId: string; value: WolfPrivate | null } | null>(null)

  useEffect(() => subscribeRoom((value) => setRoom({ value })), [])
  useEffect(() => {
    syncServerClock(uid).catch((error) => console.error('서버 시각 맞추기 실패', error))
  }, [uid])

  const gameId = room?.value?.gameId ?? null
  useEffect(() => (gameId ? subscribeGame(gameId, setGame) : undefined), [gameId])
  // 다른 판의 문서가 남아 있으면 쓰지 않는다
  const currentGame = game && game.id === gameId ? game : null
  const playing = !!currentGame?.players.includes(uid)

  useEffect(
    () => (gameId && playing ? subscribePrivate(gameId, uid, (value) => setPriv({ gameId, value })) : undefined),
    [gameId, playing, uid],
  )
  const myPrivate = priv && priv.gameId === gameId ? priv.value : null

  // 내가 이 판의 방장이면 자동 딜러를 돌린다 (밤·낮·투표 동안)
  const active = !!currentGame && ['night', 'day', 'vote'].includes(currentGame.phase)
  const isHost = currentGame?.hostId === uid
  useEffect(() => (gameId && isHost && active ? runWolfHost(gameId) : undefined), [gameId, isHost, active])

  // 결과가 나오면 내 전적을 한 번 남긴다
  const savedFor = useRef<string | null>(null)
  useEffect(() => {
    const g = currentGame
    if (!g || g.phase !== 'result' || !g.result || !playing || savedFor.current === g.id) return
    savedFor.current = g.id
    const seat = g.players.indexOf(uid)
    saveRecord(uid, g.id, g.result.final[seat], g.result.winnerIds.includes(uid)).catch((error) =>
      console.error('전적 저장 실패', error),
    )
  }, [currentGame, playing, uid])

  return {
    loaded: room !== null,
    room: room?.value ?? null,
    game: currentGame,
    playing,
    myPrivate,
  }
}

/** 서버 기준 지금 시각을 주기적으로 갱신 */
export function useServerNow(intervalMs = 250) {
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

