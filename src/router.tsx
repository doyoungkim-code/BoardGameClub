import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGate, RequireOwner } from '@/components/layout/AuthGate'
import type { RouteHandle } from '@/components/layout/routeHandle'
import { PlaceholderPage } from '@/components/PlaceholderPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PendingPage } from '@/features/auth/PendingPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { HomePage } from '@/features/home/HomePage'
import {
  AdminPage,
  ChannelRoomPage,
  ChatIndexPage,
  ChatLayout,
  DmRoomPage,
  EventDetailPage,
  EventFormPage,
  EventsPage,
  MePage,
} from '@/features/lazyPages'
import { MorePage } from '@/features/more/MorePage'
import { NotFoundPage } from '@/features/NotFoundPage'

const chatHandle: RouteHandle = { layout: 'chat' }
const roomHandle: RouteHandle = { immersive: true }

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
          {
            element: <ChatLayout />,
            handle: chatHandle,
            children: [
              { path: 'chat', element: <ChatIndexPage /> },
              { path: 'chat/:channelId', element: <ChannelRoomPage />, handle: roomHandle },
              { path: 'dm/:dmId', element: <DmRoomPage />, handle: roomHandle },
            ],
          },
          { path: 'events', element: <EventsPage /> },
          { path: 'events/new', element: <EventFormPage /> },
          { path: 'events/:eventId', element: <EventDetailPage /> },
          { path: 'events/:eventId/edit', element: <EventFormPage /> },
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
