import { useEffect } from 'react'
import { CalendarDays, Megaphone, MessageCircle, NotebookPen } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { APP_NAME } from '@/lib/constants'
import { formatEventDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { startEventsSync, useEvents } from '@/stores/events'

export function HomePage() {
  const nickname = useAuth((s) => s.profile?.nickname)
  const unread = useUnreadCount()
  const { loaded, upcoming } = useEvents()

  useEffect(() => startEventsSync(), [])

  // 취소된 모임은 홈에서 감춘다
  const nextEvent = upcoming.find((event) => !event.canceled)

  const sections = [
    {
      title: '다가오는 모임',
      to: nextEvent ? `/events/${nextEvent.id}` : '/events',
      icon: CalendarDays,
      text: !loaded ? '불러오는 중…' : nextEvent ? `${nextEvent.title} · ${formatEventDate(nextEvent.startAt)}` : '예정된 모임이 없어요',
      highlight: !!nextEvent,
    },
    { title: '공지사항', to: '/board/notice', icon: Megaphone, text: '고정된 공지가 없어요' },
    {
      title: '채팅',
      to: '/chat',
      icon: MessageCircle,
      text: unread > 0 ? `안 읽은 대화방이 ${unread}개 있어요` : '새 메시지가 없어요',
      highlight: unread > 0,
    },
    { title: '최근 플레이', to: '/plays', icon: NotebookPen, text: '아직 기록이 없어요' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{APP_NAME}</p>
        <h1 className="text-2xl font-bold">{nickname}님, 오늘은 무슨 게임 할까요?</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ title, to, icon: Icon, text, highlight }) => (
          <Link key={title} to={to} className="block">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center gap-2">
                <Icon className="size-4 text-primary" />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className={cn('text-sm', highlight ? 'font-medium text-primary' : 'text-muted-foreground')}>
                {text}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
