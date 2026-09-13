import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { GameCard } from '@/features/games/GameCard'
import { EMPTY_FILTER, isFilterActive, matchesFilter, type GameFilter } from '@/services/games'
import { startGamesSync, useGames } from '@/stores/games'
import { WEIGHT_LABEL } from '@/types/game'

const PLAYER_CHOICES = [2, 3, 4, 5, 6]
const TIME_CHOICES = [30, 60, 90, 120]

export function GamesPage() {
  const { loaded, games } = useGames()
  const [filter, setFilter] = useState<GameFilter>(EMPTY_FILTER)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => startGamesSync(), [])

  // 등록된 게임에 실제로 쓰인 태그만 고른다
  const allTags = useMemo(
    () => [...new Set(games.flatMap((game) => game.tags))].sort((a, b) => a.localeCompare(b, 'ko')),
    [games],
  )
  const shown = useMemo(() => games.filter((game) => matchesFilter(game, filter)), [games, filter])
  const active = isFilterActive(filter)

  const patch = (next: Partial<GameFilter>) => setFilter((prev) => ({ ...prev, ...next }))
  const toggleTag = (tag: string) =>
    patch({ tags: filter.tags.includes(tag) ? filter.tags.filter((t) => t !== tag) : [...filter.tags, tag] })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">보드게임</h1>
        <Button asChild size="sm">
          <Link to="/games/new">
            <Plus className="size-4" />
            게임 등록
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.keyword}
            onChange={(e) => patch({ keyword: e.target.value })}
            placeholder="게임 이름 검색"
            aria-label="게임 이름 검색"
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters || active ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters((v) => !v)}
          aria-label="필터"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="space-y-3 rounded-xl border p-3">
          <FilterRow label="인원">
            {PLAYER_CHOICES.map((n) => (
              <Chip
                key={n}
                active={filter.players === n}
                onClick={() => patch({ players: filter.players === n ? 0 : n })}
              >
                {n}인
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="플레이 시간">
            {TIME_CHOICES.map((m) => (
              <Chip
                key={m}
                active={filter.maxTime === m}
                onClick={() => patch({ maxTime: filter.maxTime === m ? 0 : m })}
              >
                {m}분 이하
              </Chip>
            ))}
          </FilterRow>

          <FilterRow label="난이도">
            {[1, 2, 3, 4, 5].map((w) => (
              <Chip key={w} active={filter.weight === w} onClick={() => patch({ weight: filter.weight === w ? 0 : w })}>
                {WEIGHT_LABEL[w]}
              </Chip>
            ))}
          </FilterRow>

          {allTags.length > 0 && (
            <FilterRow label="태그">
              {allTags.map((tag) => (
                <Chip key={tag} active={filter.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </Chip>
              ))}
            </FilterRow>
          )}

          <FilterRow label="대여">
            <Chip active={filter.availableOnly} onClick={() => patch({ availableOnly: !filter.availableOnly })}>
              지금 빌릴 수 있는 것만
            </Chip>
          </FilterRow>

          {active && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilter({ ...EMPTY_FILTER, keyword: filter.keyword })}>
              <X className="size-4" />
              필터 초기화
            </Button>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {loaded ? `${shown.length}개` : '불러오는 중…'}
        {loaded && shown.length !== games.length && ` (전체 ${games.length}개)`}
      </p>

      {!loaded ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          {games.length === 0 ? '아직 등록된 게임이 없어요. 첫 게임을 올려보세요!' : '조건에 맞는 게임이 없어요'}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}>
      <Badge variant={active ? 'default' : 'outline'} className="cursor-pointer font-normal">
        {children}
      </Badge>
    </button>
  )
}
