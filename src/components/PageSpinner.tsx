import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-1 items-center justify-center py-20', className)}>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}
