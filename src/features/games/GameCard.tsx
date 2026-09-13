import { Clock, Users } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { playerRangeText } from '@/services/games'
import { WEIGHT_LABEL, type Game } from '@/types/game'

export function GameCard({ game }: { game: Game }) {
  return (
    <Link to={`/games/${game.id}`} className="block">
      <Card className="py-3 transition-colors hover:border-primary/40">
        <CardContent className="space-y-2 px-4">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-semibold">{game.name}</p>
            {game.borrowerId ? (
              <Badge variant="secondary">대여 중</Badge>
            ) : (
              game.ownership === 'club' && <Badge variant="outline">공용</Badge>
            )}
          </div>
          {game.altName && <p className="truncate text-xs text-muted-foreground">{game.altName}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {playerRangeText(game)}
            </span>
            {game.playTimeMin !== null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {game.playTimeMin}분
              </span>
            )}
            {game.weight !== null && <span>{WEIGHT_LABEL[game.weight]}</span>}
            {game.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-muted px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
