import { TierShield } from '@/components/TierShield'
import { titleText } from '@/data/titles'
import { cn } from '@/lib/utils'
import { useMembers } from '@/stores/members'
import { useMemberTier } from '@/stores/progress'

type Props = {
  uid: string
  /** 회원 목록에 없을 때(강퇴 등) 보여줄 이름 */
  fallback?: string
  /** 대표 칭호를 붙일지 (좁은 곳에서는 끈다) */
  showTitle?: boolean
  className?: string
}

/**
 * 닉네임 표시: [티어 방패] 대표 칭호 닉네임 → "🛡 모임의 신 홍길동".
 * 채팅·게시판·모임 참석자·회원 목록·통계에서 같이 쓴다.
 */
export function MemberName({ uid, fallback, showTitle = true, className }: Props) {
  const member = useMembers((s) => s.byId[uid])
  const progress = useMemberTier(member ? uid : undefined)
  const name = member?.nickname ?? fallback ?? '알 수 없는 회원'
  const title = showTitle && member ? titleText(member.titleId, member.grantedTitles) : null

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      {progress && <TierShield tier={progress.tier} />}
      <span className="truncate">
        {title && <span className="font-normal text-primary">{title} </span>}
        {name}
      </span>
    </span>
  )
}
