import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toErrorMessage } from '@/lib/format'
import { hasStarted, setAttendeesByOwner } from '@/services/events'
import { useMembers } from '@/stores/members'
import type { ClubEvent } from '@/types/event'

type Props = {
  event: ClubEvent
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 오너 전용: 모임 참석자를 직접 넣고 뺀다. 지난 모임·취소된 모임·정원과 상관없다 */
export function AttendeeManagerDialog({ event, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 열 때마다 현재 참석자로 새로 시작하도록 open 일 때만 내용을 그린다 */}
      {open && <ManagerContent event={event} onDone={() => onOpenChange(false)} />}
    </Dialog>
  )
}

function ManagerContent({ event, onDone }: { event: ClubEvent; onDone: () => void }) {
  const { members, byId } = useMembers()
  const [selected, setSelected] = useState(() => new Set(event.attendeeIds))
  const [keyword, setKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  // 출석 체크를 이미 쓰고 있는 모임이면, 새로 넣은 사람을 출석으로도 체크할지 고른다.
  // (출석 체크를 안 쓴 모임은 참석자 전원이 출석으로 집계되므로 물어볼 필요가 없다)
  const usesAttendance = hasStarted(event) && event.attendedIds.length > 0
  const [markAttended, setMarkAttended] = useState(true)

  // 회원 목록에 없는 참석자(강퇴 등)도 뺄 수 있게 함께 보여준다
  const rows = useMemo(() => {
    const extra = event.attendeeIds.filter((uid) => !byId[uid]).map((uid) => ({ uid, nickname: '알 수 없는 회원', photoURL: null }))
    const all = [...members.map((m) => ({ uid: m.uid, nickname: m.nickname, photoURL: m.photoURL })), ...extra]
    const clean = keyword.trim().toLowerCase()
    return clean ? all.filter((row) => row.nickname.toLowerCase().includes(clean)) : all
  }, [members, byId, event.attendeeIds, keyword])

  const toggle = (uid: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })

  const added = [...selected].filter((uid) => !event.attendeeIds.includes(uid))
  const removed = event.attendeeIds.filter((uid) => !selected.has(uid))

  const save = async () => {
    // 기존 순서를 지키고 새로 넣은 사람을 뒤에 붙인다
    const attendeeIds = [...event.attendeeIds.filter((uid) => selected.has(uid)), ...added]
    const attendedIds = [
      ...event.attendedIds.filter((uid) => selected.has(uid)),
      ...(usesAttendance && markAttended ? added : []),
    ]
    setSaving(true)
    try {
      await setAttendeesByOwner(event.id, attendeeIds, attendedIds)
      toast.success('참석자를 바꿨어요')
      onDone()
    } catch (error) {
      console.error('참석자 관리 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-md">
      <DialogHeader>
        <DialogTitle>참석자 관리</DialogTitle>
        <DialogDescription>지난 모임도 참석자를 직접 넣고 뺄 수 있어요. 정원은 무시돼요.</DialogDescription>
      </DialogHeader>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="닉네임 검색"
          aria-label="닉네임 검색"
          className="pl-9"
        />
      </div>

      <ul className="-mx-2 min-h-0 flex-1 divide-y overflow-y-auto">
        {rows.map((row) => (
          <li key={row.uid}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
              <input
                type="checkbox"
                checked={selected.has(row.uid)}
                onChange={() => toggle(row.uid)}
                className="size-4 accent-primary"
              />
              <UserAvatar name={row.nickname} photoURL={row.photoURL} className="size-8" />
              <span className="min-w-0 flex-1 truncate text-sm">{row.nickname}</span>
            </label>
          </li>
        ))}
      </ul>

      {usesAttendance && added.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={markAttended}
            onChange={(e) => setMarkAttended(e.target.checked)}
            className="size-4 accent-primary"
          />
          새로 넣은 {added.length}명을 출석으로도 체크
        </label>
      )}

      <DialogFooter className="items-center gap-2 sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {selected.size}명 {added.length > 0 && `· ${added.length}명 추가`} {removed.length > 0 && `· ${removed.length}명 빼기`}
        </p>
        <Button onClick={() => void save()} disabled={saving || (added.length === 0 && removed.length === 0)}>
          저장
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
