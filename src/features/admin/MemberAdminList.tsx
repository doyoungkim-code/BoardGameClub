import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { grantedTitleKey, grantedTitleName, MAX_GRANTED_TITLE_LENGTH } from '@/data/titles'
import { formatRelative, referrerLabel, toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { daysSinceActive, fetchAdminMemo, saveAdminMemo } from '@/services/members'
import { setGrantedTitles, setUserStatus, updateReferrer } from '@/services/users'
import { useMembers } from '@/stores/members'
import { FOUNDER_REFERRER, type UserProfile } from '@/types/user'

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

/**
 * 관리자가 주는 칭호 (특별한 때만. 예: "2026 올해의 MVP").
 * 이름을 적어 추가하면 회원이 자기 프로필에서 대표 칭호로 고를 수 있다
 */
function GrantedTitlesEditor({ member }: { member: UserProfile }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const granted = member.grantedTitles ?? []

  /** 저장했으면 true */
  const save = async (next: string[], message: string) => {
    setSaving(true)
    try {
      await setGrantedTitles(member.uid, next)
      toast.success(message)
      return true
    } catch (error) {
      console.error('칭호 저장 실패', error)
      toast.error(toErrorMessage(error))
      return false
    } finally {
      setSaving(false)
    }
  }

  const add = () => {
    const name = draft.trim()
    if (!name) return
    const key = grantedTitleKey(name)
    if (granted.includes(key)) {
      toast('이미 준 칭호예요')
      return
    }
    void save([...granted, key], `'${name}' 칭호를 줬어요`).then((ok) => ok && setDraft(''))
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">관리자가 주는 칭호</p>
      {granted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {granted.map((key) => (
            <Badge key={key} variant="secondary" className="gap-1 font-normal">
              {grantedTitleName(key)}
              <button
                type="button"
                disabled={saving}
                onClick={() => void save(granted.filter((k) => k !== key), '칭호를 뺐어요')}
                aria-label={`${grantedTitleName(key)} 칭호 빼기`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              add()
            }
          }}
          maxLength={MAX_GRANTED_TITLE_LENGTH}
          placeholder="예: 2026 올해의 MVP"
          className="bg-card"
          aria-label="줄 칭호 이름"
        />
        <Button size="sm" variant="outline" className="h-9 shrink-0" disabled={saving || !draft.trim()} onClick={add}>
          주기
        </Button>
      </div>
    </div>
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
            <SelectItem value={FOUNDER_REFERRER}>초기 멤버 (소개자 없음)</SelectItem>
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

      <GrantedTitlesEditor member={member} />

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
