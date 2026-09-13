import {
  CalendarDays,
  ChartColumn,
  Dices,
  Ellipsis,
  House,
  Megaphone,
  MessageCircle,
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

/** 모바일 하단 탭 */
export const TAB_ITEMS: NavItem[] = [
  { to: '/', label: '홈', icon: House },
  { to: '/events', label: '모임', icon: CalendarDays },
  { to: '/chat', label: '채팅', icon: MessageCircle, badge: 'chat' },
  { to: '/games', label: '게임', icon: Dices },
  { to: '/more', label: '더보기', icon: Ellipsis },
]

/** 하단 탭에 없는 메뉴 (모바일: 더보기 화면, PC: 사이드바 아래쪽) */
export const MORE_ITEMS: NavItem[] = [
  { to: '/stats', label: '통계', icon: ChartColumn },
  { to: '/board/notice', label: '게시판', icon: Megaphone },
  { to: '/members', label: '회원', icon: Users },
  { to: '/me', label: '내 정보', icon: UserRound },
  { to: '/admin', label: '관리자', icon: ShieldCheck, ownerOnly: true },
]

/** 현재 사용자가 볼 수 있는 MORE_ITEMS (오너 전용 메뉴 포함 여부) */
export function useMoreItems() {
  const isOwner = useIsOwner()
  return MORE_ITEMS.filter((item) => !item.ownerOnly || isOwner)
}
