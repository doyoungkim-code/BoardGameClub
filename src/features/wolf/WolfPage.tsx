import { PageHeader } from '@/components/PageHeader'
import { PageSpinner } from '@/components/PageSpinner'
import { GameScreen } from '@/features/wolf/GameScreen'
import { Lobby } from '@/features/wolf/Lobby'
import { useWolf } from '@/features/wolf/useWolf'
import { useAuth } from '@/stores/auth'

/**
 * /wolf — 「한밤의 늑대」: 한자리에 모여 각자 폰으로 하는 한밤의 늑대인간.
 * 방은 하나. 대기실에서 모두 준비하면 방장이 시작하고, 방장 폰이 자동 딜러가 된다
 */
export function WolfPage() {
  const uid = useAuth((s) => s.profile!.uid)
  const { loaded, room, game, playing, myPrivate } = useWolf(uid)

  if (!loaded) return <PageSpinner />

  const inGame = room?.status === 'playing' && game && playing
  return (
    <div className="space-y-6">
      {!inGame && (
        <PageHeader
          title="한밤의 늑대"
          subtitle="한자리에 모여 각자 폰으로 하는 한밤의 늑대인간. 이름은 실명으로 보여요"
          backTo="/games"
        />
      )}
      {inGame ? (
        <GameScreen game={game} priv={myPrivate} uid={uid} />
      ) : room?.status === 'playing' ? (
        <p className="border-2 border-border bg-card p-4 text-center text-sm">
          지금 판이 진행 중이에요. 끝나면 같이 할 수 있어요.
        </p>
      ) : (
        <Lobby room={room} uid={uid} />
      )}
    </div>
  )
}
