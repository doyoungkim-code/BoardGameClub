import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-5xl">🎲</p>
      <h1 className="text-xl font-bold">페이지를 찾을 수 없어요</h1>
      <Button asChild>
        <Link to="/">홈으로</Link>
      </Button>
    </div>
  )
}
