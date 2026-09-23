import { useEffect, useState } from 'react'
import { ChartColumn, Map as MapIcon, Megaphone, MessageCircle } from 'lucide-react'
import { Link } from 'react-router'
import { InstallAppCard } from '@/components/InstallAppCard'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { NextEventCard } from '@/features/home/NextEventCard'
import { ProfileBanner } from '@/features/home/ProfileBanner'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { APP_NAME } from '@/lib/constants'
import { fetchTopNotices, toPost } from '@/services/posts'
import { cn } from '@/lib/utils'
import type { Post } from '@/types/post'
import { useAuth } from '@/stores/auth'
import { startEventsSync } from '@/stores/events'

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

  const shortcuts = [
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
      text: unread > 0 ? `안 읽은 대화방 ${unread}개` : '새 메시지가 없어요',
      highlight: unread > 0,
    },
    { title: '통계', to: '/stats', icon: ChartColumn, text: '참석 랭킹 보기' },
    { title: '지도', to: '/places', icon: MapIcon, text: '보드게임카페 찾기' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={APP_NAME} title={`${nickname}님, 오늘은 무슨 게임 할까요?`} />

      <ProfileBanner />

      <section className="space-y-2">
        <h2 className="font-semibold">다가오는 모임</h2>
        <NextEventCard />
      </section>

      <div className="grid grid-cols-2 gap-3">
        {shortcuts.map(({ title, to, icon: Icon, text, highlight }) => (
          <Link key={title} to={to} className="block">
            <Card className="h-full py-0 transition-colors hover:border-primary/40 active:bg-muted">
              <CardContent className="space-y-1 px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Icon className="size-4 text-primary" />
                  {title}
                </p>
                <p className={cn('truncate text-xs', highlight ? 'font-medium text-primary' : 'text-muted-foreground')}>
                  {text}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
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
    </div>
  )
}
