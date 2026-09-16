import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGate, RequireOwner } from '@/components/layout/AuthGate'
import type { RouteHandle } from '@/components/layout/routeHandle'
import { LoginPage } from '@/features/auth/LoginPage'
import { PendingPage } from '@/features/auth/PendingPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { HomePage } from '@/features/home/HomePage'
import {
  AdminPage,
  BoardPage,
  ChannelRoomPage,
  ChatIndexPage,
  ChatLayout,
  DmRoomPage,
  EventDetailPage,
  EventFormPage,
  EventsPage,
  GamesPage,
  MemberProfilePage,
  MembersPage,
  MePage,
  PostDetailPage,
  PostFormPage,
  StatsPage,
} from '@/features/lazyPages'
import { MorePage } from '@/features/more/MorePage'
import { NotFoundPage } from '@/features/NotFoundPage'

const chatHandle: RouteHandle = { layout: 'chat' }
const roomHandle: RouteHandle = { immersive: true }

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
          { path: 'stats', element: <StatsPage /> },
          { path: 'board/:board', element: <BoardPage /> },
          { path: 'posts/new', element: <PostFormPage /> },
          { path: 'posts/:postId', element: <PostDetailPage /> },
          { path: 'posts/:postId/edit', element: <PostFormPage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'members/:uid', element: <MemberProfilePage /> },
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
