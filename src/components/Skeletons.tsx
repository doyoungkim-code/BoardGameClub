import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** 카드 목록 자리 표시. 실제 카드와 비슷한 높이로 둬서 다 불러왔을 때 화면이 덜 움직인다 */
export function CardSkeleton({ count = 2, className }: { count?: number; className?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn('h-24 w-full rounded-xl', className)} />
      ))}
    </div>
  )
}

/** 사진 + 두 줄짜리 목록(회원·채팅방) 자리 표시 */
export function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}
