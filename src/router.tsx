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
  GameDetailPage,
  GameFormPage,
  GamesPage,
  MePage,
  StatsPage,
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
          { path: 'games', element: <GamesPage /> },
          { path: 'games/new', element: <GameFormPage /> },
          { path: 'games/:gameId', element: <GameDetailPage /> },
          { path: 'games/:gameId/edit', element: <GameFormPage /> },
          { path: 'stats', element: <StatsPage /> },
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
