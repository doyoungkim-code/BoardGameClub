import { useState, type ReactNode } from 'react'
import { Hash, Plus } from 'lucide-react'
import { NavLink } from 'react-router'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChannelFormDialog } from '@/features/chat/ChannelFormDialog'
import { NewDmDialog } from '@/features/chat/NewDmDialog'
import { formatChatListTime, toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { createDefaultChannels, isRoomUnread, otherMemberId, roomKey } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import { useChat } from '@/stores/chat'
import { useMembers } from '@/stores/members'
import type { Timestamp } from 'firebase/firestore'

export function ChatList() {
  const profile = useAuth((s) => s.profile)!
  const isOwner = profile.role === 'owner'
  const { loaded, channels, dms, readAt } = useChat()
  const byId = useMembers((s) => s.byId)
  const [channelDialogOpen, setChannelDialogOpen] = useState(false)
  const [dmDialogOpen, setDmDialogOpen] = useState(false)
  const [creatingDefaults, setCreatingDefaults] = useState(false)

  const since = profile.approvedAt?.toMillis() ?? 0
  // 메시지를 한 번이라도 주고받은 DM만 목록에 표시
  const activeDms = dms.filter((d) => d.lastMessageAt)

  const handleCreateDefaults = async () => {
    setCreatingDefaults(true)
    try {
      await createDefaultChannels(profile.uid)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setCreatingDefaults(false)
    }
  }

  return (
    <div className="flex flex-col md:h-full">
      <h1 className="px-4 pt-4 pb-2 text-2xl font-bold md:pt-6 md:text-xl">채팅</h1>

      <div className="flex-1 px-2 pb-24 md:overflow-y-auto md:pb-4">
        <SectionHeader
          title="채널"
          action={
            isOwner && (
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setChannelDialogOpen(true)} aria-label="새 채널">
                <Plus className="size-4" />
              </Button>
            )
          }
        />
        {!loaded ? (
          <ListSkeleton />
        ) : channels.length === 0 ? (
          <div className="mx-2 space-y-3 rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            <p>아직 채널이 없어요</p>
            {isOwner && (
              <Button size="sm" onClick={handleCreateDefaults} disabled={creatingDefaults}>
                기본 채널 만들기 (전체·번개·잡담)
              </Button>
            )}
          </div>
        ) : (
          channels.map((c) => {
            const sender = c.lastSenderId ? byId[c.lastSenderId]?.nickname : undefined
            return (
              <RoomLink
                key={c.id}
                to={`/chat/${c.id}`}
                icon={
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Hash className="size-4" />
                  </span>
                }
                title={c.name}
                preview={c.lastMessagePreview ? `${sender ? `${sender}: ` : ''}${c.lastMessagePreview}` : c.description}
                time={c.lastMessageAt}
                unread={isRoomUnread(c, roomKey('channel', c.id), profile.uid, readAt, since)}
              />
            )
          })
        )}

        <SectionHeader
          title="DM"
          className="mt-4"
          action={
            <Button variant="ghost" size="icon" className="size-7" onClick={() => setDmDialogOpen(true)} aria-label="새 대화">
              <Plus className="size-4" />
            </Button>
          }
        />
        {loaded && activeDms.length === 0 && (
          <button
            type="button"
            onClick={() => setDmDialogOpen(true)}
            className="mx-2 block w-[calc(100%-1rem)] rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted"
          >
            회원에게 1:1 메시지를 보내보세요
          </button>
        )}
        {activeDms.map((d) => {
          const other = otherMemberId(d.id, profile.uid)
          const member = other ? byId[other] : undefined
          const name = member?.nickname ?? '알 수 없는 회원'
          return (
            <RoomLink
              key={d.id}
              to={`/dm/${d.id}`}
              icon={<UserAvatar name={name} photoURL={member?.photoURL} className="size-10" />}
              title={name}
              preview={d.lastMessagePreview}
              time={d.lastMessageAt}
              unread={isRoomUnread(d, roomKey('dm', d.id), profile.uid, readAt, since)}
            />
          )
        })}
      </div>

      {isOwner && (
        <ChannelFormDialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen} nextOrder={channels.length} />
      )}
      <NewDmDialog open={dmDialogOpen} onOpenChange={setDmDialogOpen} />
    </div>
  )
}

function SectionHeader({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-9 items-center justify-between px-3', className)}>
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      {action}
    </div>
  )
}

type RoomLinkProps = {
  to: string
  icon: ReactNode
  title: string
  preview: string
  time: Timestamp | null
  unread: boolean
}

function RoomLink({ to, icon, title, preview, time, unread }: RoomLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted', isActive && 'bg-muted')
      }
    >
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('truncate', unread ? 'font-bold' : 'font-medium')}>{title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatChatListTime(time)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', unread ? 'text-foreground' : 'text-muted-foreground')}>{preview || ' '}</p>
          {unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="안 읽음" />}
        </div>
      </div>
    </NavLink>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}
