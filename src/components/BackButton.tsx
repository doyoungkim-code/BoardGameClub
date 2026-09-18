import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { historyIndex } from '@/hooks/useAppHistory'
import { cn } from '@/lib/utils'

type Props = {
  /** 앱 안에서 돌아갈 기록이 없을 때(주소로 바로 들어온 경우) 갈 곳 */
  fallback: string
  label?: string
  className?: string
}

/**
 * 화면 위쪽 "<" 버튼. 휴대폰 뒤로가기와 똑같이 한 칸 돌아간다.
 * (예전처럼 목록 주소로 새로 이동하면 기록이 계속 쌓여서 뒤로가기로 앱이 안 꺼졌다)
 */
export function BackButton({ fallback, label = '뒤로', className }: Props) {
  const navigate = useNavigate()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn(className)}
      onClick={() => (historyIndex() > 0 ? navigate(-1) : navigate(fallback, { replace: true }))}
    >
      <ChevronLeft className="size-5" />
    </Button>
  )
}
