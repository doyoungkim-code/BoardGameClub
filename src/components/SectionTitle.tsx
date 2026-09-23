import type { ReactNode } from 'react'

/** 화면 안 작은 구역의 제목 줄 (제목 + 옆에 개수·안내) */
export function SectionTitle({ children, count }: { children: ReactNode; count?: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-2 font-semibold">
      {children}
      {count && <span className="text-sm font-normal text-muted-foreground">{count}</span>}
    </h2>
  )
}
