import { useEffect, useState } from 'react'
import { onSnapshot, query, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatRelative, toErrorMessage } from '@/lib/format'
import { approveUser, getUserPrivate, setUserStatus, toProfile, usersCol } from '@/services/users'
import { useMembers } from '@/stores/members'
import type { UserProfile } from '@/types/user'

const NO_REFERRER = 'none'

// 2단계: 가입 승인 대기열과 거절·강퇴 계정 복구. 회원 관리·활동 통계는 7단계에서 추가.
export function AdminPage() {
  const [pending, setPending] = useState<UserProfile[] | null>(null)
  const [inactive, setInactive] = useState<UserProfile[]>([])

  useEffect(() => {
    const byCreatedAt = (a: UserProfile, b: UserProfile) =>
      (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)

    const unsubPending = onSnapshot(query(usersCol, where('status', '==', 'pending')), (snap) =>
      setPending(snap.docs.map(toProfile).sort(byCreatedAt)),
    )
    const unsubInactive = onSnapshot(query(usersCol, where('status', 'in', ['rejected', 'removed'])), (snap) =>
      setInactive(snap.docs.map(toProfile).sort(byCreatedAt)),
    )
    return () => {
      unsubPending()
      unsubInactive()
    }
  }, [])

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">관리자</h1>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          가입 승인 대기
          {!!pending?.length && <Badge>{pending.length}</Badge>}
        </h2>
        {pending === null ? null : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            대기 중인 신청이 없어요
          </p>
        ) : (
          pending.map((applicant) => <ApplicantCard key={applicant.uid} applicant={applicant} />)
        )}
      </section>

      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">거절·이용 중지 계정</h2>
          <Card className="py-2">
            <CardContent className="divide-y px-4">
              {inactive.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 py-2">
                  <UserAvatar name={u.nickname} photoURL={u.photoURL} className="size-8" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{u.nickname}</p>
                    <p className="text-xs text-muted-foreground">{u.status === 'rejected' ? '가입 거절' : '이용 중지'}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => runAction(() => setUserStatus(u.uid, 'pending'), '대기 목록으로 옮겼어요')}>
                    다시 검토
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}

function ApplicantCard({ applicant }: { applicant: UserProfile }) {
  const members = useMembers((s) => s.members)
  const [email, setEmail] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // 입력한 소개자 이름과 닉네임·구글 이름이 같은 회원이 있으면 미리 선택
  const guessed = members.find(
    (m) => applicant.referrerName && (m.nickname === applicant.referrerName || m.googleName === applicant.referrerName),
  )
  const [referrerId, setReferrerId] = useState<string | null>(null)
  const selected = referrerId ?? guessed?.uid ?? NO_REFERRER

  useEffect(() => {
    getUserPrivate(applicant.uid)
      .then((info) => setEmail(info?.email ?? null))
      .catch(() => setEmail(null))
  }, [applicant.uid])

  const act = async (fn: () => Promise<void>, message: string) => {
    setBusy(true)
    await runAction(fn, message)
    setBusy(false)
  }

  return (
    <Card className="py-4">
      <CardContent className="space-y-4 px-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={applicant.nickname} photoURL={applicant.photoURL} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{applicant.nickname}</p>
            <p className="truncate text-xs text-muted-foreground">
              {applicant.googleName}
              {email && ` · ${email}`}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(applicant.createdAt)}</span>
        </div>

        <div className="space-y-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
          <p>
            <span className="text-muted-foreground">입력한 소개자 </span>
            <span className="font-medium">{applicant.referrerName || '-'}</span>
          </p>
          <Select value={selected} onValueChange={setReferrerId}>
            <SelectTrigger className="w-full bg-card" aria-label="소개 회원 연결">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_REFERRER}>연결 안 함 (입력한 이름으로 표시)</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.uid} value={m.uid}>
                  {m.nickname}
                  {m.googleName && m.googleName !== m.nickname ? ` (${m.googleName})` : ''}의 지인
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act(() => setUserStatus(applicant.uid, 'rejected'), `${applicant.nickname}님의 신청을 거절했어요`)}
          >
            거절
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              act(
                () => approveUser(applicant.uid, selected === NO_REFERRER ? null : selected),
                `${applicant.nickname}님을 승인했어요`,
              )
            }
          >
            승인
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

async function runAction(fn: () => Promise<void>, successMessage: string) {
  try {
    await fn()
    toast.success(successMessage)
  } catch (error) {
    console.error(error)
    toast.error(toErrorMessage(error))
  }
}
