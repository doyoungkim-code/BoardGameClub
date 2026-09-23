import { Suspense, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { CHAT_ITEM, TAB_ITEMS, useMoreItems, type NavItem } from '@/components/layout/nav'
import { useRouteHandle } from '@/components/layout/routeHandle'
import { useAppHistory, useTabNavigate } from '@/hooks/useAppHistory'
import { useChatNotifications } from '@/hooks/useChatNotifications'
import { useScrolled } from '@/hooks/useScrolled'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { startChatSync } from '@/stores/chat'
import { startMembersSync } from '@/stores/members'
import { startProgressSync } from '@/stores/progress'

/** 승인된 회원에게만 렌더링되는 앱 공통 레이아웃 */
export function AppShell() {
  const profile = useAuth((s) => s.profile)!
  const { layout, immersive } = useRouteHandle()
  const { pathname } = useLocation()
  const fullHeight = layout === 'chat'
  // 채팅은 안쪽 영역이 스크롤돼서 이 방식으로는 알 수 없다 → 항상 테두리를 둔다
  const { scrolled, sentinelRef } = useScrolled()
  const headerSolid = scrolled || fullHeight

  useEffect(() => startMembersSync(), [])
  // 닉네임 옆 티어 표시용 (모든 회원 출석 횟수, 6시간마다 새로)
  useEffect(() => startProgressSync(), [])
  useEffect(() => startChatSync(profile.uid), [profile.uid])
  useChatNotifications()
  // 뒤로가기: 탭에서는 홈으로, 홈에서는 두 번 눌러 종료 (설치한 앱)
  useAppHistory()

  return (
    <div className={cn('min-h-dvh md:flex', fullHeight && 'md:h-dvh md:overflow-hidden')}>
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col md:min-h-0 md:min-w-0">
        {!immersive && (
          <header
            className={cn(
              // 테두리 자리는 늘 잡아 두고 색만 바꾼다 (1px 씩 밀리지 않게)
              'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-transparent bg-background/90 px-4 backdrop-blur transition-shadow md:hidden',
              headerSolid && 'border-border shadow-sm',
            )}
          >
            <HomeLink className="font-bold text-primary" />
            <div className="flex items-center gap-1.5">
              {/* 채팅은 하단 탭 대신 여기서 들어간다 */}
              <Link
                to={CHAT_ITEM.to}
                aria-label={CHAT_ITEM.label}
                className="relative flex size-9 items-center justify-center rounded-full text-foreground active:bg-accent"
              >
                <CHAT_ITEM.icon className="size-5" />
                <UnreadBadge className="absolute top-1 right-0.5" />
              </Link>
              <Link to="/me" aria-label="내 정보">
                <UserAvatar name={profile.nickname} photoURL={profile.photoURL} className="size-8" />
              </Link>
            </div>
          </header>
        )}
        <main
          className={
            fullHeight
              ? 'flex min-h-0 flex-1 flex-col'
              : // 모바일에서는 하단 탭(h-16)에 가려지지 않도록 아래 여백 확보
                'mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8'
          }
        >
          {/* 헤더 테두리 판단용 표시 (useScrolled) */}
          {!fullHeight && <div ref={sentinelRef} className="h-px" />}
          {/* 화면을 옮길 때 살짝 나타나게. 기기에서 애니메이션을 껐으면 그냥 바뀐다 */}
          <div
            key={pathname}
            className={cn(
              'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200',
              // 채팅은 남은 높이를 다 써야 한다
              fullHeight && 'flex min-h-0 flex-1 flex-col',
            )}
          >
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      {!immersive && <BottomTabs />}
    </div>
  )
}

/** 앱 이름 = 홈 버튼. 홈 탭과 똑같이 기록을 쌓지 않는다 */
function HomeLink({ className }: { className?: string }) {
  const goToTab = useTabNavigate()
  return (
    <Link
      to="/"
      className={className}
      onClick={(e) => {
        e.preventDefault()
        goToTab('/')
      }}
    >
      {APP_NAME}
    </Link>
  )
}

function Sidebar() {
  const profile = useAuth((s) => s.profile)!
  const moreItems = useMoreItems()

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
      <HomeLink className="mb-6 px-3 text-lg font-bold text-sidebar-primary" />
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {TAB_ITEMS.filter((item) => item.to !== '/more').map((item) => (
          <SidebarLink key={item.to} item={item} tab />
        ))}
        {/* PC 에서는 채팅도 메뉴로 (모바일은 헤더 아이콘) */}
        <SidebarLink item={CHAT_ITEM} />
        <div className="my-3 border-t border-sidebar-border" />
        {moreItems.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>
      <Link to="/me" className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent">
        <UserAvatar name={profile.nickname} photoURL={profile.photoURL} className="size-8" />
        <span className="truncate text-sm font-medium">{profile.nickname}</span>
      </Link>
    </aside>
  )
}

/** tab: 하단 탭과 같은 메뉴면 기록을 쌓지 않고 옮긴다 (useTabNavigate) */
function SidebarLink({ item, tab }: { item: NavItem; tab?: boolean }) {
  const Icon = item.icon
  const goToTab = useTabNavigate()
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={
        tab
          ? (e) => {
              e.preventDefault()
              goToTab(item.to)
            }
          : undefined
      }
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent',
          isActive && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4" />
      {item.label}
      {item.badge === 'chat' && <UnreadBadge className="ml-auto" />}
    </NavLink>
  )
}

function BottomTabs() {
  const goToTab = useTabNavigate()
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <ul className="grid h-16 grid-cols-5">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={(e) => {
                  // 탭끼리는 기록을 쌓지 않는다 → 어느 탭에서든 뒤로가기 = 홈
                  e.preventDefault()
                  goToTab(item.to)
                }}
                className="flex h-full flex-col items-center justify-center gap-0.5 text-[11px]"
              >
                {({ isActive }) => (
                  <>
                    {/* 켜진 탭은 아이콘 뒤에 알약 배경 */}
                    <span
                      className={cn(
                        'relative flex items-center justify-center rounded-full px-4 py-1 transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                      )}
                    >
                      <Icon className="size-5" />
                      {item.badge === 'chat' && <UnreadBadge className="absolute -top-1 right-1.5" />}
                    </span>
                    <span className={isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function UnreadBadge({ className }: { className?: string }) {
  const count = useUnreadCount()
  if (count === 0) return null
  return (
    <span
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground',
        className,
      )}
      aria-label={`안 읽은 대화방 ${count}개`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
