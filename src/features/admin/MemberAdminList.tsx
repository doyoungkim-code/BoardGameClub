import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatRelative, referrerLabel, toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { daysSinceActive, fetchAdminMemo, saveAdminMemo } from '@/services/members'
import { setUserStatus, updateReferrer } from '@/services/users'
import { useMembers } from '@/stores/members'
import type { UserProfile } from '@/types/user'

const NO_REFERRER = 'none'

/** 며칠 이상 안 들어오면 눈에 띄게 표시할지 */
const IDLE_WARN = 30
const IDLE_ALERT = 60

/** 승인된 회원 관리: 상태 변경, 소개자 수정, 메모, 미활동 표시 */
export function MemberAdminList() {
  const { members, byId } = useMembers()
  const [openUid, setOpenUid] = useState<string | null>(null)

  const idleCount = members.filter((m) => (daysSinceActive(m) ?? 0) >= IDLE_WARN).length

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        회원 관리
        <Badge variant="secondary">{members.length}명</Badge>
        {idleCount > 0 && <span className="text-xs font-normal text-muted-foreground">{IDLE_WARN}일+ 미활동 {idleCount}명</span>}
      </h2>

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {members.map((member) => (
          <li key={member.uid}>
            <button
              type="button"
              onClick={() => setOpenUid(openUid === member.uid ? null : member.uid)}
              aria-expanded={openUid === member.uid}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted"
            >
              <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-9" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-medium">
                  {member.nickname}
                  {member.role === 'owner' && <Badge variant="secondary">오너</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{referrerLabel(member, byId) ?? '소개자 없음'}</p>
              </div>
              <IdleBadge member={member} />
            </button>
            {openUid === member.uid && <MemberAdminPanel member={member} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

function IdleBadge({ member }: { member: UserProfile }) {
  const days = daysSinceActive(member)
  if (days === null) return <span className="shrink-0 text-xs text-muted-foreground">기록 없음</span>
  return (
    <span
      className={cn(
        'shrink-0 text-xs',
        days >= IDLE_ALERT ? 'font-medium text-destructive' : days >= IDLE_WARN ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {formatRelative(member.lastActiveAt)}
    </span>
  )
}

function MemberAdminPanel({ member }: { member: UserProfile }) {
  const members = useMembers((s) => s.members)
  const [memo, setMemo] = useState<string | null>(null)
  const [savingMemo, setSavingMemo] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // 패널을 열 때만 메모를 읽는다 (오너만 접근 가능한 문서)
  useEffect(() => {
    let canceled = false
    fetchAdminMemo(member.uid)
      .then((value) => !canceled && setMemo(value))
      .catch((error) => {
        console.error('메모 불러오기 실패', error)
        if (!canceled) setMemo('')
      })
    return () => {
      canceled = true
    }
  }, [member.uid])

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn()
      toast.success(message)
    } catch (error) {
      console.error('회원 관리 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-4 border-t bg-muted/40 px-4 py-4">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">소개한 회원</p>
        <Select
          value={member.referrerId ?? NO_REFERRER}
          onValueChange={(value) =>
            void run(
              () => updateReferrer(member.uid, value === NO_REFERRER ? null : value),
              '소개자를 바꿨어요',
            )
          }
        >
          <SelectTrigger className="w-full bg-card" aria-label="소개 회원 연결">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_REFERRER}>연결 안 함 ({member.referrerName || '입력값 없음'})</SelectItem>
            {members
              .filter((m) => m.uid !== member.uid)
              .map((m) => (
                <SelectItem key={m.uid} value={m.uid}>
                  {m.nickname}의 지인
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">메모 (오너만 볼 수 있어요)</p>
        <Textarea
          value={memo ?? ''}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="예: 목요일 모임 주로 참석"
          className="bg-card"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={savingMemo || memo === null}
          onClick={() => {
            setSavingMemo(true)
            void run(() => saveAdminMemo(member.uid, memo ?? ''), '메모를 저장했어요').finally(() =>
              setSavingMemo(false),
            )
          }}
        >
          메모 저장
        </Button>
      </div>

      {member.role !== 'owner' && (
        <Button variant="destructive" size="sm" className="w-full" onClick={() => setConfirmRemove(true)}>
          이용 중지 (강퇴)
        </Button>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`${member.nickname}님을 이용 중지할까요?`}
        description="앱에 들어올 수 없게 되고 다시 신청할 수도 없어요. 관리자 화면에서 되돌릴 수 있어요."
        confirmLabel="이용 중지"
        destructive
        onConfirm={() => run(() => setUserStatus(member.uid, 'removed'), `${member.nickname}님을 이용 중지했어요`)}
      />
    </div>
  )
}
