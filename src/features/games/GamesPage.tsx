import { useMemo, useState } from 'react'
import { Dices, Search, Users, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GAMES, supportsPlayers, type CatalogGame } from '@/data/games'
import { cn } from '@/lib/utils'

/** "몇 명이서 할 수 있어?" 필터 버튼 */
const PLAYER_CHOICES = [2, 3, 4, 5, 6, 7, 8, 10]

/** 동호회에 있는 보드게임 목록 (보기 전용. 목록은 src/data/games.ts) */
export function GamesPage() {
  const [keyword, setKeyword] = useState('')
  const [players, setPlayers] = useState<number | null>(null)

  const shown = useMemo(() => {
    const clean = keyword.trim().toLowerCase()
    return GAMES.filter(
      (game) =>
        (!clean || `${game.name} ${game.description}`.toLowerCase().includes(clean)) &&
        (players === null || supportsPlayers(game, players)),
    )
  }, [keyword, players])

  return (
    <div className="space-y-6">
      <PageHeader
        title="보드게임"
        actions={
          <span className="text-sm text-muted-foreground">
            {shown.length === GAMES.length ? `${GAMES.length}개` : `${shown.length} / ${GAMES.length}개`}
          </span>
        }
      />

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="이름이나 설명으로 검색 (예: 추리, 블러핑)"
          aria-label="게임 검색"
          className="pr-9 pl-9"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword('')}
            aria-label="검색어 지우기"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Users className="size-3" />
          몇 명이서 할까요?
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLAYER_CHOICES.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setPlayers(players === count ? null : count)}
              aria-pressed={players === count}
            >
              <Badge variant={players === count ? 'default' : 'outline'} className="cursor-pointer px-2.5 py-1 font-normal">
                {count}명
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={Dices}
          title="조건에 맞는 게임이 없어요"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setKeyword('')
                setPlayers(null)
              }}
            >
              조건 지우기
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((game) => (
            <GameItem key={game.name} game={game} />
          ))}
        </ul>
      )}
    </div>
  )
}

function GameItem({ game }: { game: CatalogGame }) {
  return (
    <li className="flex gap-3.5 rounded-xl border bg-card p-3.5">
      <Cover game={game} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="leading-snug font-semibold">{game.name}</p>
        <Badge variant="secondary" className="font-normal">
          {game.players}
        </Badge>
        <p className="text-sm leading-relaxed text-muted-foreground">{game.description}</p>
      </div>
    </li>
  )
}

/** 표지. 이미지가 없거나 못 불러오면 이름 첫 글자로 대신한다 */
function Cover({ game }: { game: CatalogGame }) {
  const [broken, setBroken] = useState(false)
  const box =
    'flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border'

  if (!game.image || broken) {
    return (
      <div className={cn(box, 'text-2xl font-bold text-primary')} aria-hidden>
        {game.name.slice(0, 1)}
      </div>
    )
  }
  return (
    <div className={box}>
      <img
        src={game.image}
        alt={`${game.name} 표지`}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="size-full object-contain"
      />
    </div>
  )
}
