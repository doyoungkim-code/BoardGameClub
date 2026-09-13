import { CalendarDays, Megaphone, MessageCircle, NotebookPen } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/stores/auth'

const SECTIONS = [
  { title: '다가오는 모임', to: '/events', icon: CalendarDays, empty: '예정된 모임이 없어요' },
  { title: '공지사항', to: '/board/notice', icon: Megaphone, empty: '고정된 공지가 없어요' },
  { title: '안 읽은 채팅', to: '/chat', icon: MessageCircle, empty: '새 메시지가 없어요' },
  { title: '최근 플레이', to: '/plays', icon: NotebookPen, empty: '아직 기록이 없어요' },
]

export function HomePage() {
  const nickname = useAuth((s) => s.profile?.nickname)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{APP_NAME}</p>
        <h1 className="text-2xl font-bold">{nickname}님, 오늘은 무슨 게임 할까요?</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ title, to, icon: Icon, empty }) => (
          <Link key={title} to={to} className="block">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center gap-2">
                <Icon className="size-4 text-primary" />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{empty}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
