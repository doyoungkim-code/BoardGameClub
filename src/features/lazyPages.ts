import { lazy } from 'react'

// 첫 화면에 필요 없는 기능은 화면을 열 때 불러온다 (초기 로딩 크기 줄이기)

export const ChatLayout = lazy(() => import('@/features/chat/ChatLayout').then((m) => ({ default: m.ChatLayout })))

export const ChatIndexPage = lazy(() =>
  import('@/features/chat/ChatLayout').then((m) => ({ default: m.ChatIndexPage })),
)

export const ChannelRoomPage = lazy(() =>
  import('@/features/chat/ChannelRoomPage').then((m) => ({ default: m.ChannelRoomPage })),
)

export const DmRoomPage = lazy(() => import('@/features/chat/DmRoomPage').then((m) => ({ default: m.DmRoomPage })))

export const EventsPage = lazy(() => import('@/features/events/EventsPage').then((m) => ({ default: m.EventsPage })))

export const EventFormPage = lazy(() =>
  import('@/features/events/EventFormPage').then((m) => ({ default: m.EventFormPage })),
)

export const EventDetailPage = lazy(() =>
  import('@/features/events/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
)

export const GamesPage = lazy(() => import('@/features/games/GamesPage').then((m) => ({ default: m.GamesPage })))

// 지도 라이브러리(Leaflet)는 이 화면에서만 불러온다
export const PlacesPage = lazy(() => import('@/features/places/PlacesPage').then((m) => ({ default: m.PlacesPage })))

export const StatsPage = lazy(() => import('@/features/stats/StatsPage').then((m) => ({ default: m.StatsPage })))

export const BoardPage = lazy(() => import('@/features/board/BoardPage').then((m) => ({ default: m.BoardPage })))

export const PostFormPage = lazy(() =>
  import('@/features/board/PostFormPage').then((m) => ({ default: m.PostFormPage })),
)

export const PostDetailPage = lazy(() =>
  import('@/features/board/PostDetailPage').then((m) => ({ default: m.PostDetailPage })),
)

export const MembersPage = lazy(() =>
  import('@/features/members/MembersPage').then((m) => ({ default: m.MembersPage })),
)

export const MemberProfilePage = lazy(() =>
  import('@/features/members/MemberProfilePage').then((m) => ({ default: m.MemberProfilePage })),
)

export const MePage = lazy(() => import('@/features/me/MePage').then((m) => ({ default: m.MePage })))

export const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
