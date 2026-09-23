import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export type SegmentedItem = {
  key: string
  label: string
  icon?: LucideIcon
  /** 주소가 있으면 링크로, 없으면 버튼으로 (onSelect 사용) */
  to?: string
}

type Props = {
  items: SegmentedItem[]
  /** 지금 켜진 항목의 key */
  active: string
  onSelect?: (key: string) => void
  className?: string
}

/** 회색 띠 안에 든 탭 (모임의 목록·캘린더, 게시판의 게시판 고르기) */
export function SegmentedTabs({ items, active, onSelect, className }: Props) {
  return (
    <div className={cn('flex gap-1 rounded-lg bg-muted p-1', className)}>
      {items.map((item) => {
        const Icon = item.icon
        const on = item.key === active
        const inner = (
          <>
            {Icon && <Icon className="size-4" />}
            {item.label}
          </>
        )
        const itemClass = cn(
          'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors',
          on ? 'bg-background font-semibold shadow-xs' : 'text-muted-foreground',
        )
        return item.to ? (
          <Link key={item.key} to={item.to} aria-current={on ? 'page' : undefined} className={itemClass}>
            {inner}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect?.(item.key)}
            className={itemClass}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}
