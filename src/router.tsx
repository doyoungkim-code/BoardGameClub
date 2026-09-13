import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGate, RequireOwner } from '@/components/layout/AuthGate'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PendingPage } from '@/features/auth/PendingPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { HomePage } from '@/features/home/HomePage'
import { MePage } from '@/features/me/MePage'
import { MorePage } from '@/features/more/MorePage'
import { NotFoundPage } from '@/features/NotFoundPage'

// 아직 만들지 않은 기능 화면은 PlaceholderPage로 두고 단계별로 교체한다.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AuthGate />,
    children: [
      { path: '/signup', element: <SignupPage /> },
      { path: '/pending', element: <PendingPage /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'events/*', element: <PlaceholderPage title="모임" step={4} /> },
          { path: 'chat/*', element: <PlaceholderPage title="채팅" step={3} /> },
          { path: 'dm/*', element: <PlaceholderPage title="DM" step={3} /> },
          { path: 'games/*', element: <PlaceholderPage title="보드게임" step={5} /> },
          { path: 'plays/*', element: <PlaceholderPage title="플레이 기록" step={5} /> },
          { path: 'stats', element: <PlaceholderPage title="통계" step={5} /> },
          { path: 'board/*', element: <PlaceholderPage title="게시판" step={6} /> },
          { path: 'posts/*', element: <PlaceholderPage title="게시글" step={6} /> },
          { path: 'members/*', element: <PlaceholderPage title="회원" step={7} /> },
          { path: 'me', element: <MePage /> },
          { path: 'more', element: <MorePage /> },
          {
            element: <RequireOwner />,
            children: [{ path: 'admin', element: <AdminPage /> }],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
