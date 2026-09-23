import { useMemo, useState } from 'react'
import { Search, UserSearch } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { MemberName } from '@/components/MemberName'
import { PageHeader } from '@/components/PageHeader'
import { CardSkeleton } from '@/components/Skeletons'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { referrerLabel } from '@/lib/format'
import { tappableRow } from '@/lib/styles'
import { cn } from '@/lib/utils'
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
    <div className="space-y-6">
      <PageHeader
        title="회원"
        actions={<span className="text-sm text-muted-foreground">{loaded ? `${members.length}명` : ''}</span>}
      />

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
        <CardSkeleton className="h-14" />
      ) : shown.length === 0 ? (
        <EmptyState icon={UserSearch} title="찾는 회원이 없어요" description="다른 이름으로 검색해 보세요" />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((member) => {
            const referrer = referrerLabel(member, byId)
            return (
              <li key={member.uid}>
                <Link to={`/members/${member.uid}`} className={cn('flex items-center gap-3 px-4 py-3', tappableRow)}>
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
