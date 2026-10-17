import { useState } from 'react'
import { Check, Lock } from '@/components/icons'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { SectionTitle } from '@/components/SectionTitle'
import { NewMark } from '@/features/members/AchievementList'
import { titleArt } from '@/data/badgeArt'
import { AUTO_TITLES, autoTitleKey, grantedTitleName } from '@/data/titles'
import { toErrorMessage } from '@/lib/format'
import { tierTint } from '@/lib/tier'
import { cn } from '@/lib/utils'
import { PixelSprite } from '@/pixel/PixelSprite'
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
    ...earnedAuto.map((t) => ({ key: autoTitleKey(t), text: t.text, description: `${t.description} 달성` })),
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
        // 얻은 칭호: 그림 + 이름 + 무엇을 달성해서 얻었는지 (휴대폰에서도 보이게 글로 적는다)
        <ul className="grid gap-2 sm:grid-cols-2">
          {owned.map((title) => {
            const selected = title.key === current
            return (
              <li key={title.key} className="relative">
                {newKeys?.has(title.key) && <NewMark />}
                <button
                  type="button"
                  disabled={!isMe || saving}
                  onClick={() => void choose(selected ? null : title.key)}
                  aria-pressed={isMe ? selected : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 border-2 bg-card px-3 py-2 text-left disabled:cursor-default',
                    isMe && !selected && 'hover:border-primary/50',
                  )}
                  // 대표로 고른 칭호는 티어 색으로 (프로필 배너와 같은 결)
                  style={selected ? { borderColor: tier.color, background: tierTint(tier.color, 18) } : undefined}
                >
                  <PixelSprite sprite={titleArt(title.key)!} scale={3} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold" style={selected ? { color: tier.color } : undefined}>
                      {title.text}
                    </span>
                    <span className="block text-xs text-muted-foreground">{title.description}</span>
                  </span>
                  {selected && (
                    <span className="flex shrink-0 items-center gap-1 text-xs" style={{ color: tier.color }}>
                      <Check className="size-3" />
                      대표
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {isMe && lockedAuto.length > 0 && (
        <ul className="grid gap-2 pt-1 sm:grid-cols-2">
          {lockedAuto.map((t) => {
            const value = Math.min(stats[t.metric], t.goal)
            return (
              <li key={t.id} className="flex items-center gap-3 border-2 border-dashed px-3 py-2 text-muted-foreground">
                <PixelSprite sprite={titleArt(autoTitleKey(t))!} scale={3} className="opacity-30 grayscale" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <Lock className="size-3" />
                    {t.text}
                  </span>
                  <span className="block text-xs">
                    {t.description} ({value}/{t.goal})
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
