import { NavLink, Outlet } from 'react-router'
import { MORE_ITEMS, TAB_ITEMS, type NavItem } from '@/components/layout/nav'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function AppShell() {
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col md:min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <span className="font-bold text-primary">{APP_NAME}</span>
        </header>
        {/* 모바일에서는 하단 탭(h-16)에 가려지지 않도록 아래 여백 확보 */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pt-8 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomTabs />
    </div>
  )
}

function Sidebar() {
  // TODO(2단계): 오너 여부에 따라 ownerOnly 메뉴 노출
  const moreItems = MORE_ITEMS.filter((item) => !item.ownerOnly)

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
      <div className="mb-6 px-3 text-lg font-bold text-sidebar-primary">{APP_NAME}</div>
      <nav className="flex flex-1 flex-col gap-1">
        {TAB_ITEMS.filter((item) => item.to !== '/more').map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
        <div className="my-3 border-t border-sidebar-border" />
        {moreItems.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent',
          isActive && 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4" />
      {item.label}
    </NavLink>
  )
}

function BottomTabs() {
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
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground',
                    isActive && 'font-semibold text-primary',
                  )
                }
              >
                <Icon className="size-5" />
                {item.label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
