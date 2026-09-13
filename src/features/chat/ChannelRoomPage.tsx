import { useState } from 'react'
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageSpinner } from '@/components/PageSpinner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChannelFormDialog } from '@/features/chat/ChannelFormDialog'
import { RoomNotFound } from '@/features/chat/ChatLayout'
import { ChatRoom } from '@/features/chat/ChatRoom'
import { toErrorMessage } from '@/lib/format'
import { deleteChannel } from '@/services/chat'
import { useIsOwner } from '@/stores/auth'
import { useChat } from '@/stores/chat'
import type { Channel } from '@/types/chat'

export function ChannelRoomPage() {
  const { channelId = '' } = useParams()
  const loaded = useChat((s) => s.loaded)
  const channel = useChat((s) => s.channels.find((c) => c.id === channelId))
  const isOwner = useIsOwner()

  if (!channel) return loaded ? <RoomNotFound /> : <PageSpinner />

  return (
    <ChatRoom
      key={channelId}
      type="channel"
      roomId={channelId}
      title={`# ${channel.name}`}
      subtitle={channel.description}
      actions={isOwner && <ChannelMenu channel={channel} />}
    />
  )
}

function ChannelMenu({ channel }: { channel: Channel }) {
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = async () => {
    try {
      await deleteChannel(channel.id)
      toast.success(`# ${channel.name} 채널을 삭제했어요`)
      navigate('/chat', { replace: true })
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="채널 관리">
            <EllipsisVertical className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            채널 수정
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            채널 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChannelFormDialog open={editOpen} onOpenChange={setEditOpen} channel={channel} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`# ${channel.name} 채널을 삭제할까요?`}
        description="채널이 목록에서 사라지고 대화 내용도 볼 수 없게 돼요."
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
