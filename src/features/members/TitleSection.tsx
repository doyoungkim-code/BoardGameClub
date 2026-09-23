import { useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { SectionTitle } from '@/components/SectionTitle'
import { NewMark } from '@/features/members/AchievementList'
import { AUTO_TITLES, autoTitleKey, grantedTitleName } from '@/data/titles'
import { toErrorMessage } from '@/lib/format'
import { tierTint } from '@/lib/tier'
import { cn } from '@/lib/utils'
import type { ActivityStats, Progress } from '@/services/activity'
import { setMyTitle } from '@/services/users'
import type { UserProfile } from '@/types/user'

type Props = {
  member: UserProfile
  stats: ActivityStats
  progress: Progress
  /** 본인이면 눌러서 대표 칭호를 고른다 */
  isMe: boolean
  /** 새로 얻은 칭호 값 ('auto:…' / 'granted:…') */
  newKeys?: Set<string>
}

/**
 * 칭호 목록. 가진 칭호는 모두 보이고, 본인은 눌러서 대표 칭호(닉네임 앞에 붙는 것)를 고른다.
 * 본인에게는 아직 못 얻은 자동 칭호도 흐리게 조건과 함께 보여준다 (목표가 되도록)
 */
export function TitleSection({ member, stats, progress, isMe, newKeys }: Props) {
  const [saving, setSaving] = useState(false)
  const tier = progress.tier
  const granted = member.grantedTitles ?? []
  const earnedAuto = AUTO_TITLES.filter((t) => progress.earnedAutoIds.has(t.id))
  const lockedAuto = AUTO_TITLES.filter((t) => !progress.earnedAutoIds.has(t.id))
  const owned = [
    ...granted.map((key) => ({ key, text: grantedTitleName(key), description: '관리자가 준 칭호' })),
    ...earnedAuto.map((t) => ({ key: autoTitleKey(t), text: t.text, description: t.description })),
  ]
  const current = member.titleId ?? null

  const choose = async (key: string | null) => {
    if (!isMe || saving || key === current) return
    setSaving(true)
    try {
      await setMyTitle(member.uid, key)
      toast.success(key ? '대표 칭호를 바꿨어요' : '칭호를 뗐어요')
    } catch (error) {
      console.error('대표 칭호 저장 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (!isMe && owned.length === 0) return null

  return (
    <section className="space-y-2">
      <SectionTitle count={isMe ? '눌러서 닉네임 앞에 붙일 칭호를 골라요' : `${owned.length}개`}>칭호</SectionTitle>

      {owned.length === 0 ? (
        <EmptyState title="아직 얻은 칭호가 없어요" size="sm" />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {owned.map((title) => {
            const selected = title.key === current
            return (
              <li key={title.key} className="relative">
                {newKeys?.has(title.key) && <NewMark />}
                <button
                  type="button"
                  disabled={!isMe || saving}
                  onClick={() => void choose(selected ? null : title.key)}
                  title={title.description}
                  aria-pressed={isMe ? selected : undefined}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-default',
                    selected ? 'font-semibold' : 'bg-card',
                    isMe && !selected && 'hover:border-primary/50',
                  )}
                  // 대표로 고른 칭호는 티어 색으로 (프로필 배너와 같은 결)
                  style={
                    selected ? { borderColor: tier.color, background: tierTint(tier.color, 18), color: tier.color } : undefined
                  }
                >
                  {selected && <Check className="size-3.5" />}
                  {title.text}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isMe && lockedAuto.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {lockedAuto.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
            >
              <Lock className="size-3" />
              {t.text}
              <span className="text-[11px]">
                · {t.description} ({Math.min(stats[t.metric], t.goal)}/{t.goal})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
