import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GAME_RULES } from '@/data/gameRules'
import type { CatalogGame } from '@/data/games'

type Props = { game: CatalogGame | null; onOpenChange: (open: boolean) => void }

/** 게임을 누르면 보이는 간단 룰 (src/data/gameRules.ts) */
export function GameRuleDialog({ game, onOpenChange }: Props) {
  const rule = game ? GAME_RULES[game.name] : undefined
  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {game && (
          <>
            <DialogHeader>
              <DialogTitle>{game.name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {game.players}
                </Badge>
                {game.description}
              </DialogDescription>
            </DialogHeader>
            {rule ? (
              <div className="space-y-4 text-sm">
                <p className="border-l-4 border-primary bg-muted px-3 py-2 font-bold">{rule.goal}</p>
                {rule.setup && <RuleList title="준비" items={rule.setup} />}
                <RuleList title="진행" items={rule.play} />
                <RuleList title="끝·승패" items={rule.end} />
                <p className="text-xs text-muted-foreground">처음 하는 사람을 위한 간단 정리예요. 자세한 예외는 상자 속 룰북을 봐 주세요.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">룰 정리를 준비하고 있어요.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RuleList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-1.5">
      <h3 className="font-bold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
