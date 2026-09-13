import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/home/HomePage'
import { MorePage } from '@/features/more/MorePage'
import { NotFoundPage } from '@/features/NotFoundPage'

// 1단계: 화면 뼈대와 라우트만 정의. 각 기능 화면은 이후 단계에서 PlaceholderPage를 교체한다.
// 로그인·승인 가드(RequireMember/RequireOwner)는 2단계에서 추가.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
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
      { path: 'admin', element: <PlaceholderPage title="관리자" step={7} /> },
      { path: 'me', element: <PlaceholderPage title="내 정보" step={2} /> },
      { path: 'more', element: <MorePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
