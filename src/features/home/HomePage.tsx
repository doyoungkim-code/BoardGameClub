import { useEffect, useState } from 'react'
import { CalendarDays, ChartColumn, Megaphone, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { InstallAppCard } from '@/components/InstallAppCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { APP_NAME } from '@/lib/constants'
import { formatEventDate } from '@/lib/format'
import { fetchTopNotices, toPost } from '@/services/posts'
import { cn } from '@/lib/utils'
import type { Post } from '@/types/post'
import { useAuth } from '@/stores/auth'
import { startEventsSync, useEvents } from '@/stores/events'

/** 홈의 설치 안내를 닫았는지 (내 정보 화면에는 계속 나온다) */
const INSTALL_DISMISSED_KEY = 'installCardDismissed'

function readInstallDismissed() {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function HomePage() {
  const nickname = useAuth((s) => s.profile?.nickname)
  const unread = useUnreadCount()
  const { loaded, upcoming } = useEvents()
  const [notice, setNotice] = useState<Post | null | undefined>(undefined)
  const [installDismissed, setInstallDismissed] = useState(readInstallDismissed)

  useEffect(() => startEventsSync(), [])

  // 공지는 실시간 구독까지 필요 없어서 홈에서 한 번만 읽는다 (고정 글이 먼저 온다)
  useEffect(() => {
    fetchTopNotices(1)
      .then((snap) => setNotice(snap.docs.length > 0 ? toPost(snap.docs[0]) : null))
      .catch((error) => {
        console.error('공지 불러오기 실패', error)
        setNotice(null)
      })
  }, [])

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
    {
      title: '공지사항',
      to: notice ? `/posts/${notice.id}` : '/board/notice',
      icon: Megaphone,
      text: notice === undefined ? '불러오는 중…' : (notice?.title ?? '아직 공지가 없어요'),
      highlight: !!notice?.pinned,
    },
    {
      title: '채팅',
      to: '/chat',
      icon: MessageCircle,
      text: unread > 0 ? `안 읽은 대화방이 ${unread}개 있어요` : '새 메시지가 없어요',
      highlight: unread > 0,
    },
    {
      title: '통계',
      to: '/stats',
      icon: ChartColumn,
      text: '모임 참석 랭킹 보기',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{APP_NAME}</p>
        <h1 className="text-2xl font-bold">{nickname}님, 오늘은 무슨 게임 할까요?</h1>
      </div>

      {!installDismissed && (
        <InstallAppCard
          onDismiss={() => {
            setInstallDismissed(true)
            try {
              localStorage.setItem(INSTALL_DISMISSED_KEY, '1')
            } catch {
              // 저장 못 해도 이번에는 닫힌다
            }
          }}
        />
      )}

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
