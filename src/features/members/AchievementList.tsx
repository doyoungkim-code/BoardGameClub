import { SectionTitle } from '@/components/SectionTitle'
import { ATTENDANCE_ACHIEVEMENTS } from '@/data/achievements'
import { achievementArt } from '@/data/badgeArt'
import { pixelBlocks, tierEdge, tierTint } from '@/lib/tier'
import { cn } from '@/lib/utils'
import { PixelSprite } from '@/pixel/PixelSprite'
import type { Progress } from '@/services/activity'

type Props = {
  progress: Progress
  /** 새로 달성한 업적 (출석 횟수). 본인 프로필에서만 */
  newGoals?: Set<number>
  /** 다른 회원 프로필: 달성한 업적만 한 줄로 */
  compact?: boolean
}

/**
 * 출석 업적. 달성한 칸은 **지금 티어 색**을 옅게 입혀서 프로필 배너와 같은 결로 보이게 한다.
 * - 본인: 전체 목록. 달성한 것은 색, 못 한 것은 흐리게 + 진행도
 * - 다른 회원(compact): 달성한 것만 한 줄 (넘치면 옆으로 밀어서 본다)
 */
export function AchievementList({ progress, newGoals, compact }: Props) {
  const unlocked = new Set(progress.unlockedGoals)
  const color = progress.tier.color
  const doneStyle = { borderColor: tierEdge(color, 45), background: tierTint(color, 10) }

  if (compact) {
    const done = ATTENDANCE_ACHIEVEMENTS.filter((a) => unlocked.has(a.goal))
    if (done.length === 0) return null
    return (
      <section className="space-y-2">
        <SectionTitle count={`${done.length}개`}>업적</SectionTitle>
        <ul className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {done.map((achievement) => (
            <li
              key={achievement.goal}
              title={`출석 ${achievement.goal}회`}
              className="flex shrink-0 items-center gap-1 border px-3 py-1 text-sm"
              style={doneStyle}
            >
              <PixelSprite sprite={achievementArt(achievement.goal)} scale={2} />
              {achievement.name}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <SectionTitle count={`${unlocked.size} / ${ATTENDANCE_ACHIEVEMENTS.length}`}>출석 업적</SectionTitle>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {ATTENDANCE_ACHIEVEMENTS.map((achievement) => {
          const done = unlocked.has(achievement.goal)
          const value = Math.min(progress.attended, achievement.goal)
          return (
            <li
              key={achievement.goal}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center',
                !done && 'border-dashed bg-muted/40',
              )}
              style={done ? doneStyle : undefined}
            >
              {newGoals?.has(achievement.goal) && <NewMark />}
              <PixelSprite
                sprite={achievementArt(achievement.goal)}
                scale={3}
                className={cn(!done && 'opacity-30 grayscale')}
              />
              <span className={cn('text-xs font-bold', !done && 'text-muted-foreground')}>{achievement.name}</span>
              <span className="text-xs text-muted-foreground">
                출석 {achievement.goal}회 · +{achievement.bonusXp}XP
              </span>
              {!done && (
                <span className="mt-auto w-full pt-1">
                  <span className="block h-2 overflow-hidden border border-foreground/50 bg-background">
                    <span
                      className="block h-full"
                      style={{ width: `${(value / achievement.goal) * 100}%`, background: pixelBlocks(color) }}
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
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
        'absolute -top-1.5 -right-1.5 bg-destructive px-1.5 py-0.5 text-xs leading-none font-bold text-white',
        className,
      )}
    >
      NEW
    </span>
  )
}
