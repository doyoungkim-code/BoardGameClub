import { Suspense } from 'react'
import { MessageCircle } from 'lucide-react'
import { Outlet } from 'react-router'
import { PageSpinner } from '@/components/PageSpinner'
import { useRouteHandle } from '@/components/layout/routeHandle'
import { ChatList } from '@/features/chat/ChatList'
import { cn } from '@/lib/utils'

/**
 * PC: 왼쪽 목록 + 오른쪽 대화방 2단
 * 모바일: 목록 화면과 대화방 화면을 따로 보여줌
 */
export function ChatLayout() {
  // 대화방 라우트에는 handle.immersive 가 붙어 있다
  const roomOpen = useRouteHandle().immersive

  return (
    <div className="flex min-h-0 flex-1">
      <aside className={cn('w-full shrink-0 md:block md:w-80 md:border-r', roomOpen ? 'hidden' : 'block')}>
        <ChatList />
      </aside>
      <section className={cn('min-w-0 flex-1 flex-col md:flex md:min-h-0', roomOpen ? 'flex' : 'hidden')}>
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </section>
    </div>
  )
}

/** /chat — PC에서 대화방을 고르기 전 오른쪽 영역 */
export function ChatIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <MessageCircle className="size-10" />
      <p className="text-sm">왼쪽에서 대화방을 골라주세요</p>
    </div>
  )
}

export function RoomNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
      <p className="text-4xl">🫥</p>
      <p className="text-sm">대화방을 찾을 수 없어요</p>
    </div>
  )
}
