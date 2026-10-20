// 「한밤의 늑대」 혼자 테스트용 봇 (에뮬레이터 전용).
// 사용: npm run emulators 와 npm run dev:emu 를 켠 상태에서 → node scripts/wolf-bots.mjs [봇 수, 기본 2]
// 봇은 가입·승인(실명 "봇1"…)한 뒤, 대기실에 사람 방장이 있으면 들어와 준비하고, 밤에는 자기 역할 행동을
// 아무렇게나 하고, 낮에는 토론 끝, 투표는 아무에게나 한다. 방장은 되지 않는다 (사람이 먼저 들어가야 함)
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import {
  arrayUnion,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

const BOTS = Number(process.argv[2] ?? 2)
const OWNER_EMAIL = 'kwat09k@gmail.com'
const CONFIG = { apiKey: 'demo-key', authDomain: 'demo-doyou-boardgame.firebaseapp.com', projectId: 'demo-doyou-boardgame' }
// src/games/wolf/timeline.ts 와 같은 값
const CARD_SEC = 12

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shuffle = (list) => [...list].sort(() => Math.random() - 0.5)

/** 에뮬레이터 가짜 구글 계정으로 로그인한 앱 하나 */
async function connect(name, sub, email) {
  const app = initializeApp(CONFIG, name)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8085)
  const token = JSON.stringify({ sub, email, email_verified: true, name })
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(token))
  return { db, uid: user.uid }
}

async function setupBots() {
  const owner = await connect('owner', 'wolf-bot-owner', OWNER_EMAIL)
  const bots = []
  for (let i = 1; i <= BOTS; i++) {
    const bot = await connect(`bot${i}`, `wolf-bot-${i}`, `bot${i}@bot.test`)
    const ref = doc(bot.db, 'users', bot.uid)
    if (!(await getDoc(ref)).exists()) {
      await setDoc(ref, {
        nickname: `봇${i}`,
        googleName: `봇${i}`,
        photoURL: null,
        role: 'member',
        status: 'pending',
        referrerName: '테스트',
        referrerId: null,
        createdAt: serverTimestamp(),
        approvedAt: null,
        lastActiveAt: serverTimestamp(),
      })
    }
    const ownerRef = doc(owner.db, 'users', bot.uid)
    if ((await getDoc(ownerRef)).get('status') !== 'approved') {
      await updateDoc(ownerRef, { status: 'approved', approvedAt: serverTimestamp(), realName: `봇${i}` })
    }
    bots.push({ ...bot, name: `봇${i}` })
  }
  return bots
}

/** 밤 시간표 (src/games/wolf/timeline.ts 와 같은 계산) */
function segmentAt(game, now) {
  let t = game.startedAt.toMillis()
  if (now < (t += CARD_SEC * 1000)) return { kind: 'card' }
  for (const [index, s] of game.steps.entries()) {
    const start = t
    t += s.units * game.stepSec * 1000
    if (now < t) return { kind: 'step', index, step: s.id, start }
  }
  return { kind: 'done' }
}

function runBot(bot) {
  const log = (...args) => console.log(`[${bot.name}]`, ...args)
  const roomRef = doc(bot.db, 'wolfRooms', 'main')
  let room = null
  let game = null
  let priv = null
  let unsubGame = null
  let unsubPriv = null
  const sent = new Set()
  const timers = {}
  let busy = false

  onSnapshot(roomRef, (snap) => {
    room = snap.exists() ? snap.data() : null
    const gameId = room?.gameId ?? null
    if (gameId !== game?.id) {
      unsubGame?.()
      unsubPriv?.()
      game = null
      priv = null
      sent.clear()
      Object.keys(timers).forEach((k) => delete timers[k])
      if (gameId) {
        unsubGame = onSnapshot(doc(roomRef, 'games', gameId), (g) => (game = g.exists() ? { id: g.id, ...g.data() } : null))
        unsubPriv = onSnapshot(doc(roomRef, 'games', gameId, 'private', bot.uid), (p) => (priv = p.exists() ? p.data() : null), () => {})
      }
    }
  })

  const once = async (key, fn, delayMs = 0) => {
    if (sent.has(key)) return
    timers[key] ??= Date.now() + delayMs
    if (Date.now() < timers[key]) return
    sent.add(key)
    try {
      await fn()
    } catch (error) {
      log('실패', key, error.code ?? error.message)
    }
  }

  setInterval(async () => {
    if (busy) return
    busy = true
    try {
      await tick()
    } finally {
      busy = false
    }
  }, 300)

  async function tick() {
    if (!room) return
    // 대기실: 사람 방장이 있으면 들어가서 준비
    if (room.status === 'lobby') {
      const humanHost = room.hostId && !room.hostId.startsWith('wolf-bot') && room.seats.includes(room.hostId) && !isBotUid(room.hostId)
      if (!room.seats.includes(bot.uid) && humanHost) {
        await runTransaction(bot.db, async (tx) => {
          const r = (await tx.get(roomRef)).data()
          if (r.seats.includes(bot.uid) || r.status !== 'lobby' || r.seats.length >= 10) return
          tx.update(roomRef, { seats: [...r.seats, bot.uid], updatedAt: serverTimestamp() })
        }).then(() => log('들어감'), (e) => log('들어가기 실패', e.code))
      } else if (room.seats.includes(bot.uid) && !room.readyIds.includes(bot.uid)) {
        await sleep(800)
        await updateDoc(roomRef, { readyIds: arrayUnion(bot.uid), updatedAt: serverTimestamp() }).then(() => log('준비'))
      }
      return
    }
    if (!game || !priv || !game.players.includes(bot.uid)) return
    const gameRef = doc(roomRef, 'games', game.id)
    const n = game.players.length
    const me = priv.seat
    const others = [...Array(n).keys()].filter((s) => s !== me)
    const centers = [n, n + 1, n + 2]
    const act = (kind, targets) =>
      once(kind, async () => {
        await setDoc(doc(gameRef, 'actions', `${bot.uid}_${kind}`), { uid: bot.uid, kind, targets, at: serverTimestamp() })
        log('밤 행동', kind, targets)
      }, 1500 + Math.random() * 1500)

    if (game.phase === 'night' && game.startedAt) {
      const seg = segmentAt(game, Date.now())
      if (seg.kind !== 'step') return
      const copied = priv.info.find((i) => i.kind === 'copy')?.role ?? null
      const role = priv.dealt === 'doppelganger' ? (copied ?? 'doppelganger') : priv.dealt
      const byRole = (r, kind) => {
        if (r === 'seer') return act(kind, Math.random() < 0.5 ? [pick(others)] : shuffle(centers).slice(0, 2))
        if (r === 'robber') return act(kind, [pick(others)])
        if (r === 'troublemaker') return act(kind, shuffle(others).slice(0, 2))
        if (r === 'drunk') return act(kind, [pick(centers)])
      }
      if (seg.step === 'doppelganger' && priv.dealt === 'doppelganger') {
        if (!copied) await act('copy', [pick(others)])
        else await byRole(copied, 'doppelAct')
      } else if (seg.step === 'werewolf' && role === 'werewolf') {
        const wolves = priv.info.find((i) => i.kind === 'wolves' && i.step === 'werewolf')
        if (wolves && wolves.seats.length === 0) await act('loneWolf', [pick(centers)])
      } else if (['seer', 'robber', 'troublemaker', 'drunk'].includes(seg.step) && priv.dealt === seg.step) {
        await byRole(seg.step, seg.step)
      }
      return
    }
    if (game.phase === 'day') {
      await once('day', () => updateDoc(gameRef, { readyIds: arrayUnion(bot.uid) }).then(() => log('토론 끝')), 3000)
      return
    }
    if (game.phase === 'vote') {
      const target = game.players[pick(others)]
      await once('vote', () => setDoc(doc(gameRef, 'votes', bot.uid), { target, at: serverTimestamp() }).then(() => log('투표')), 2000)
      return
    }
    if (game.phase === 'result') {
      await once('result', async () => {
        const won = game.result.winnerIds.includes(bot.uid)
        log(`결과: 처음 ${priv.dealt} → 마지막 ${game.result.final[me]}, ${won ? '승리' : '패배'}`)
      })
    }
  }

  const botUids = new Set()
  function isBotUid(uid) {
    return botUids.has(uid)
  }
  return { uid: bot.uid, registerBots: (uids) => uids.forEach((u) => botUids.add(u)) }
}

const bots = await setupBots()
console.log(`봇 ${bots.length}명 준비 완료: ${bots.map((b) => b.name).join(', ')}. 사람이 먼저 대기실에 들어가면 따라 들어가요 (Ctrl+C 로 끝)`)
const runners = bots.map(runBot)
runners.forEach((r) => r.registerBots(bots.map((b) => b.uid)))
