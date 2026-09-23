import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  icon?: LucideIcon
  title: string
  description?: string
  /** 다음에 할 일 (버튼 등) */
  action?: ReactNode
  /** sm: 카드 안처럼 좁은 자리 */
  size?: 'sm' | 'md'
  className?: string
}

/** 목록이 비었을 때 보여주는 점선 상자. 아이콘 + 한 줄 + (설명·버튼) */
export function EmptyState({ icon: Icon, title, description, action, size = 'md', className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center',
        size === 'md' ? 'py-10' : 'py-6',
        className,
      )}
    >
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
