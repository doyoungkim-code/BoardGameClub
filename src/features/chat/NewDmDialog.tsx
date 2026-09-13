import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/UserAvatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { referrerLabel, toErrorMessage } from '@/lib/format'
import { openDm } from '@/services/chat'
import { useAuth } from '@/stores/auth'
import { useMembers } from '@/stores/members'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewDmDialog({ open, onOpenChange }: Props) {
  const uid = useAuth((s) => s.profile!.uid)
  const members = useMembers((s) => s.members)
  const byId = useMembers((s) => s.byId)
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [busy, setBusy] = useState(false)

  const q = keyword.trim().toLowerCase()
  const candidates = members.filter(
    (m) => m.uid !== uid && (!q || m.nickname.toLowerCase().includes(q) || m.googleName.toLowerCase().includes(q)),
  )

  const start = async (otherUid: string) => {
    setBusy(true)
    try {
      const dmId = await openDm(uid, otherUid)
      onOpenChange(false)
      setKeyword('')
      navigate(`/dm/${dmId}`)
    } catch (error) {
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80dvh] flex-col sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>새 대화</DialogTitle>
          <DialogDescription>대화할 회원을 골라주세요.</DialogDescription>
        </DialogHeader>
        <Input placeholder="닉네임 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto">
          {candidates.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">회원이 없어요</li>}
          {candidates.map((m) => (
            <li key={m.uid}>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(m.uid)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted disabled:opacity-50"
              >
                <UserAvatar name={m.nickname} photoURL={m.photoURL} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.nickname}</p>
                  <p className="truncate text-xs text-muted-foreground">{referrerLabel(m, byId)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
