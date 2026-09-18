import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 화면 로딩 표시. 0.3초 넘게 걸릴 때만 나타난다 (빨리 끝나는 로딩에 번쩍이지 않게) */
export function PageSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('appear-delayed flex flex-1 items-center justify-center py-20', className)}>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}
