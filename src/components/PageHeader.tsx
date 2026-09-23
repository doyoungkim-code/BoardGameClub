import type { ReactNode } from 'react'
import { BackButton } from '@/components/BackButton'
import { cn } from '@/lib/utils'

type Props = {
  title: ReactNode
  /** 제목 위 작은 글씨 */
  eyebrow?: ReactNode
  /** 제목 아래 설명 */
  subtitle?: ReactNode
  /** 제목 오른쪽 (버튼·개수 등) */
  actions?: ReactNode
  /** 주면 제목 앞에 뒤로가기 버튼. 돌아갈 기록이 없을 때 갈 주소 */
  backTo?: string
  className?: string
}

/** 모든 화면의 제목 줄. 화면마다 따로 적던 h1·여백·오른쪽 버튼 배치를 한 곳에 모았다 */
export function PageHeader({ title, eyebrow, subtitle, actions, backTo, className }: Props) {
  return (
    <div className={cn('flex items-start gap-2', className)}>
      {backTo && <BackButton fallback={backTo} className="-ml-2 shrink-0" />}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
    </div>
  )
}
