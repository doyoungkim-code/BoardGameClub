import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { isSameDay } from 'date-fns'
import { Copy, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MemberName } from '@/components/MemberName'
import { UserAvatar } from '@/components/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { messageMillis } from '@/features/chat/useMessages'
import { formatDateDivider, formatMessageTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/chat'
import type { UserProfile } from '@/types/user'

const GROUP_GAP_MS = 5 * 60 * 1000

type Props = {
  messages: ChatMessage[]
  loaded: boolean
  hasMore: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  myUid: string
  membersById: Record<string, UserProfile>
  canDelete: (message: ChatMessage) => boolean
  onDelete: (message: ChatMessage) => void
  emptyText: string
}

export function MessageList({
  messages,
  loaded,
  hasMore,
  loadingOlder,
  onLoadOlder,
  myUid,
  membersById,
  canDelete,
  onDelete,
  emptyText,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const previous = useRef<{ firstId?: string; lastId?: string; scrollHeight: number }>({ scrollHeight: 0 })

  const firstId = messages[0]?.id
  const lastId = messages.at(-1)?.id
  const lastIsMine = messages.at(-1)?.senderId === myUid

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const prev = previous.current
    if (prev.firstId && firstId !== prev.firstId && lastId === prev.lastId) {
      // 위쪽에 이전 메시지가 붙음 → 보고 있던 위치 유지
      el.scrollTop += el.scrollHeight - prev.scrollHeight
    } else if (lastId !== prev.lastId && (nearBottom.current || lastIsMine)) {
      // 새 메시지 → 맨 아래를 보고 있었거나 내가 보냈으면 아래로
      el.scrollTop = el.scrollHeight
    }
    previous.current = { firstId, lastId, scrollHeight: el.scrollHeight }
  }, [firstId, lastId, lastIsMine, messages])

  // 맨 위 근처까지 올리면 이전 메시지 불러오기
  useEffect(() => {
    const target = topRef.current
    const root = scrollRef.current
    if (!target || !root || !loaded || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onLoadOlder(), {
      root,
      rootMargin: '300px 0px 0px 0px',
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [loaded, hasMore, onLoadOlder])

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        const el = e.currentTarget
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-5"
    >
      <div ref={topRef} />
      {loadingOlder && (
        <div className="flex justify-center py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loaded ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        messages.map((message, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const at = messageMillis(message)
          const newDay = !prev || !isSameDay(messageMillis(prev), at)
          const startsGroup = newDay || prev.senderId !== message.senderId || at - messageMillis(prev) > GROUP_GAP_MS
          const endsGroup =
            !next ||
            next.senderId !== message.senderId ||
            messageMillis(next) - at > GROUP_GAP_MS ||
            !isSameDay(messageMillis(next), at)

          return (
            <Fragment key={message.id}>
              {newDay && (
                <DateDivider label={message.createdAt ? formatDateDivider(message.createdAt.toMillis()) : '오늘'} />
              )}
              <MessageItem
                message={message}
                mine={message.senderId === myUid}
                sender={membersById[message.senderId]}
                showSender={startsGroup}
                showTime={endsGroup}
                canDelete={canDelete(message)}
                onDelete={() => onDelete(message)}
              />
            </Fragment>
          )
        })
      )}
    </div>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      {label}
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

type ItemProps = {
  message: ChatMessage
  mine: boolean
  sender?: UserProfile
  showSender: boolean
  showTime: boolean
  canDelete: boolean
  onDelete: () => void
}

function MessageItem({ message, mine, sender, showSender, showTime, canDelete, onDelete }: ItemProps) {
  const name = sender?.nickname ?? message.senderNickname
  const pending = !message.createdAt

  return (
    <div className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start', showSender ? 'mt-3' : 'mt-1')}>
      {!mine && (
        <div className="w-8 shrink-0">
          {showSender && <UserAvatar name={name} photoURL={sender?.photoURL} className="size-8" />}
        </div>
      )}
      <div className={cn('flex max-w-[78%] min-w-0 flex-col', mine ? 'items-end' : 'items-start')}>
        {!mine && showSender && (
          <MemberName
            uid={message.senderId}
            fallback={message.senderNickname}
            className="mb-1 max-w-full px-1 text-xs text-muted-foreground"
          />
        )}
        <div className={cn('flex items-end gap-1.5', mine && 'flex-row-reverse')}>
          {message.deleted ? (
            <div className="rounded-2xl border border-dashed px-3.5 py-2 text-sm text-muted-foreground italic">
              삭제된 메시지예요
            </div>
          ) : (
            <MessageMenu text={message.text} canDelete={canDelete} onDelete={onDelete}>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  'cursor-pointer rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm',
                  mine
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md border bg-card text-card-foreground',
                  pending && 'opacity-60',
                )}
              >
                <Linkified text={message.text} />
              </div>
            </MessageMenu>
          )}
          {showTime && message.createdAt && (
            <span className="shrink-0 pb-0.5 text-[10px] text-muted-foreground">
              {formatMessageTime(message.createdAt.toMillis())}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageMenu({
  text,
  canDelete,
  onDelete,
  children,
}: {
  text: string
  canDelete: boolean
  onDelete: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('복사했어요')
    } catch {
      toast.error('복사하지 못했어요')
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        asChild
        // 기본 동작은 누르는 순간 열려서 모바일 스크롤 중에도 메뉴가 뜬다 → 탭(click)했을 때만 열기
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setOpen(true)}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-32">
        <DropdownMenuItem onSelect={copy}>
          <Copy />
          복사
        </DropdownMenuItem>
        {canDelete && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            삭제
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g

function Linkified({ text }: { text: string }) {
  // split 에 캡처 그룹을 쓰면 홀수 번째 조각이 URL
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all underline underline-offset-2"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}
