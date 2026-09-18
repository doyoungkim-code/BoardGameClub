import { TierShield } from '@/components/TierShield'
import { NewMark } from '@/features/members/AchievementList'
import type { Progress } from '@/services/activity'

/** 큰 티어 방패 + 경험치 + 다음 티어까지 막대 */
export function TierCard({ progress, isNew }: { progress: Progress; isNew?: boolean }) {
  const { tier, next, xp } = progress
  const ratio = next ? (xp - tier.minXp) / (next.minXp - tier.minXp) : 1

  return (
    <section className="relative flex items-center gap-4 rounded-xl border p-4">
      {isNew && <NewMark />}
      <TierShield tier={tier} size="lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: tier.color }}>
            {tier.name}
          </span>
          <span className="text-sm text-muted-foreground">{xp.toLocaleString()} XP</span>
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(ratio, 1) * 100}%`, background: next?.color ?? tier.color }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {next ? `${next.name}까지 ${(next.minXp - xp).toLocaleString()} XP` : '최고 티어예요!'}
          {' · '}출석 {progress.attended}회
        </p>
      </div>
    </section>
  )
}
