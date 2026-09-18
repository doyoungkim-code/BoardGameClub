import { ACHIEVEMENTS, isUnlocked } from '@/data/achievements'
import { cn } from '@/lib/utils'
import type { ActivityStats } from '@/services/activity'

/** 업적 배지. 달성한 것은 색이 들어가고, 못 한 것은 흐리게 + 진행도 표시 */
export function AchievementList({ stats }: { stats: ActivityStats }) {
  const unlocked = ACHIEVEMENTS.filter((a) => isUnlocked(a, stats)).length

  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 font-semibold">
        업적
        <span className="text-sm font-normal text-muted-foreground">
          {unlocked} / {ACHIEVEMENTS.length}
        </span>
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {ACHIEVEMENTS.map((achievement) => {
          const done = isUnlocked(achievement, stats)
          const value = Math.min(stats[achievement.metric], achievement.goal)
          return (
            <li
              key={achievement.id}
              title={achievement.description}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center',
                done ? 'border-primary/40 bg-primary/5' : 'bg-muted/40',
              )}
            >
              <span className={cn('text-3xl leading-none', !done && 'opacity-30 grayscale')} aria-hidden>
                {achievement.icon}
              </span>
              <span className={cn('text-xs font-semibold', !done && 'text-muted-foreground')}>{achievement.name}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{achievement.description}</span>
              {!done && (
                <span className="mt-auto w-full pt-1">
                  <span className="block h-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/60"
                      style={{ width: `${(value / achievement.goal) * 100}%` }}
                    />
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {value} / {achievement.goal}
                  </span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
