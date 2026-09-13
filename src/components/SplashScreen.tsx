import { Loader2 } from 'lucide-react'

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <p className="text-5xl">🎲</p>
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}
