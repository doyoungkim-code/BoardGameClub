import { ATTENDANCE_ACHIEVEMENTS } from '@/data/achievements'
import { cn } from '@/lib/utils'
import type { Progress } from '@/services/activity'

type Props = {
  progress: Progress
  /** 새로 달성한 업적 (출석 횟수). 본인 프로필에서만 */
  newGoals?: Set<number>
}

/** 출석 업적 배지. 달성한 것은 색이 들어가고, 못 한 것은 흐리게 + 진행도 */
export function AchievementList({ progress, newGoals }: Props) {
  const unlocked = new Set(progress.unlockedGoals)

  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 font-semibold">
        출석 업적
        <span className="text-sm font-normal text-muted-foreground">
          {unlocked.size} / {ATTENDANCE_ACHIEVEMENTS.length}
        </span>
      </h2>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {ATTENDANCE_ACHIEVEMENTS.map((achievement) => {
          const done = unlocked.has(achievement.goal)
          const value = Math.min(progress.attended, achievement.goal)
          return (
            <li
              key={achievement.goal}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center',
                done ? 'border-primary/40 bg-primary/5' : 'bg-muted/40',
              )}
            >
              {newGoals?.has(achievement.goal) && <NewMark />}
              <span className={cn('text-3xl leading-none', !done && 'opacity-30 grayscale')} aria-hidden>
                {achievement.icon}
              </span>
              <span className={cn('text-xs font-semibold', !done && 'text-muted-foreground')}>{achievement.name}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">
                출석 {achievement.goal}회 · +{achievement.bonusXp}XP
              </span>
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

/** 새로 얻은 것 표시 */
export function NewMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'absolute -top-1.5 -right-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[9px] leading-none font-bold text-white',
        className,
      )}
    >
      NEW
    </span>
  )
}
