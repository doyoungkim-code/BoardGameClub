import { Construction } from 'lucide-react'

type Props = {
  title: string
  step: number
}

/** 아직 구현하지 않은 화면 자리 표시 */
export function PlaceholderPage({ title, step }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground">
        <Construction className="size-8" />
        <p className="text-sm">{step}단계에서 만들 화면이에요</p>
      </div>
    </div>
  )
}
