import {
  CalendarDays,
  ChartColumn,
  Dices,
  Ellipsis,
  House,
  // JS 내장 Map 과 이름이 겹치지 않게
  Map as MapIcon,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useIsOwner } from '@/stores/auth'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  ownerOnly?: boolean
  /** 'chat': 안 읽은 대화방 개수 배지 */
  badge?: 'chat'
}

/** 모바일 하단 탭. 채팅은 탭이 아니라 화면 위쪽 아이콘(CHAT_ITEM)으로 간다 */
export const TAB_ITEMS: NavItem[] = [
  { to: '/', label: '홈', icon: House },
  { to: '/events', label: '모임', icon: CalendarDays },
  { to: '/board', label: '게시판', icon: Newspaper },
  { to: '/games', label: '게임', icon: Dices },
  { to: '/more', label: '더보기', icon: Ellipsis },
]

/** 채팅: 모바일은 헤더 아이콘, PC 는 사이드바 */
export const CHAT_ITEM: NavItem = { to: '/chat', label: '채팅', icon: MessageCircle, badge: 'chat' }

/** 하단 탭에 없는 메뉴 (모바일: 더보기 화면, PC: 사이드바 아래쪽) */
export const MORE_ITEMS: NavItem[] = [
  { to: '/places', label: '지도', icon: MapIcon },
  { to: '/stats', label: '통계', icon: ChartColumn },
  { to: '/members', label: '회원', icon: Users },
  { to: '/me', label: '내 정보', icon: UserRound },
  { to: '/admin', label: '관리자', icon: ShieldCheck, ownerOnly: true },
]

/** 현재 사용자가 볼 수 있는 MORE_ITEMS (오너 전용 메뉴 포함 여부) */
export function useMoreItems() {
  const isOwner = useIsOwner()
  return MORE_ITEMS.filter((item) => !item.ownerOnly || isOwner)
}
