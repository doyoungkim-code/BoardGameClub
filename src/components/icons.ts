import { createElement, type ComponentType } from 'react'
import { PixelIcon, type PixelIconProps } from '@/components/PixelIcon'
import type { PixelIconName } from '@/data/pixelIcons'

/**
 * 앱 전체 아이콘. 예전에 쓰던 lucide 이름 그대로 픽셀 아이콘을 내보내서, 화면 코드는 import 경로만 바꿨다.
 * 그림을 바꾸려면 오른쪽 이름(src/data/pixelIcons.ts)만 고친다.
 */

export type IconComponent = ComponentType<PixelIconProps>

function icon(name: PixelIconName): IconComponent {
  const Icon = (props: PixelIconProps) => createElement(PixelIcon, { name, ...props })
  Icon.displayName = `Icon(${name})`
  return Icon
}

// 메뉴·탭
export const House = icon('home')
export const CalendarDays = icon('calendar')
export const Newspaper = icon('article')
export const Dices = icon('dice')
export const Ellipsis = icon('more-horizontal')
export const MessageCircle = icon('message')
export const MapIcon = icon('map')
export const ChartColumn = icon('chart')
export const Users = icon('users')
export const UserRound = icon('user')
export const ShieldCheck = icon('shield')

// 모임·일정
export const CalendarPlus = icon('calendar-plus')
export const CalendarCheck = icon('calendar-check')
export const Clock = icon('clock')
export const Vote = icon('checkbox-on')
export const MapPin = icon('map-pin')
export const LocateFixed = icon('gps')
export const Navigation = icon('compass')
export const Phone = icon('phone')

// 글·채팅
export const Megaphone = icon('megaphone')
export const MessageSquare = icon('comment')
export const Heart = icon('heart')
export const Pin = icon('bookmark')
export const Pencil = icon('pencil')
export const PenLine = icon('notes')
export const Send = icon('send')
export const SendHorizontal = icon('send')
export const Hash = icon('hash')
export const List = icon('bulletlist')

// 회원·업적
export const UserPlus = icon('user-plus')
export const UserX = icon('user-x')
export const UserCheck = icon('user')
export const UserSearch = icon('users')
export const Trophy = icon('trophy')
export const Crown = icon('crown')
export const Star = icon('star')
export const Lock = icon('lock')

// 공통 동작
export const Plus = icon('plus')
export const SquarePlus = icon('plus-box')
export const Search = icon('search')
export const X = icon('close')
export const XIcon = X
export const Check = icon('check')
export const CheckIcon = Check
export const ChevronLeft = icon('chevron-left')
export const ChevronRight = icon('chevron-right')
export const ChevronRightIcon = ChevronRight
export const ChevronUpIcon = icon('chevron-up')
export const ChevronDownIcon = icon('chevron-down')
export const CircleIcon = icon('circle')
export const EllipsisVertical = icon('more-vertical')
export const Trash2 = icon('trash')
export const Copy = icon('copy')
export const Share = icon('share')
export const Download = icon('download')
export const ExternalLink = icon('external-link')

// 알림(토스트)
export const CircleCheckIcon = icon('checkbox-on')
export const InfoIcon = icon('info-box')
export const TriangleAlertIcon = icon('square-alert')
export const OctagonXIcon = icon('square-alert')

// 주사위 게임·상점
export const Coins = icon('coins')
export const ShoppingBag = icon('shopping-bag')
export const Gift = icon('gift')
export const Notebook = icon('notes')
