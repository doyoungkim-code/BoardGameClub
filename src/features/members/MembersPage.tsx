import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router'
import { MemberName } from '@/components/MemberName'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { referrerLabel } from '@/lib/format'
import { useMembers } from '@/stores/members'

export function MembersPage() {
  const { loaded, members, byId } = useMembers()
  const [keyword, setKeyword] = useState('')

  const shown = useMemo(() => {
    const clean = keyword.trim().toLowerCase()
    if (!clean) return members
    return members.filter((m) => `${m.nickname} ${m.googleName}`.toLowerCase().includes(clean))
  }, [members, keyword])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">회원</h1>
        <p className="text-sm text-muted-foreground">{loaded ? `${members.length}명` : ''}</p>
      </div>

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

      {!loaded ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          찾는 회원이 없어요
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((member) => {
            const referrer = referrerLabel(member, byId)
            return (
              <li key={member.uid}>
                <Link to={`/members/${member.uid}`} className="flex items-center gap-3 px-4 py-3 active:bg-muted">
                  <UserAvatar name={member.nickname} photoURL={member.photoURL} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 font-medium">
                      <MemberName uid={member.uid} />
                      {member.role === 'owner' && <Badge variant="secondary">오너</Badge>}
                    </p>
                    {referrer && <p className="truncate text-xs text-muted-foreground">{referrer}</p>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
