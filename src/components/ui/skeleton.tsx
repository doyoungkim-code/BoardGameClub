import { cn } from "@/lib/utils"

// skeleton-loading: 0.3초 넘게 걸릴 때만 나타난다 (index.css). 빨리 끝나는 로딩에 번쩍이지 않게
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-loading rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
