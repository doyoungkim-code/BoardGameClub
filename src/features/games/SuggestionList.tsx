import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { toast } from 'sonner'
import { Check, Plus, Trash2 } from '@/components/icons'
import { EmptyState } from '@/components/EmptyState'
import { MemberName } from '@/components/MemberName'
import { CardSkeleton } from '@/components/Skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChatListTime, toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { deleteSuggestion, setSuggestionStatus, suggestionsQuery, toSuggestion } from '@/services/gameSuggestions'
import { useAuth, useIsOwner } from '@/stores/auth'
import type { GameSuggestion } from '@/types/gameSuggestion'

/** 회원들이 추천한 게임 메모 (게임 화면의 '추천' 탭). 이 탭을 열 때만 구독한다 */
export function SuggestionList({ onAdd }: { onAdd: () => void }) {
  const uid = useAuth((s) => s.profile!.uid)
  const isOwner = useIsOwner()
  const [items, setItems] = useState<GameSuggestion[] | null>(null)

  useEffect(
    () =>
      onSnapshot(
        suggestionsQuery,
        (snap) => setItems(snap.docs.map(toSuggestion)),
        (error) => {
          console.error('게임 추천 불러오기 실패', error)
          setItems([])
        },
      ),
    [],
  )

  const run = async (task: () => Promise<void>, done: string) => {
    try {
      await task()
      toast.success(done)
    } catch (error) {
      toast.error(toErrorMessage(error))
    }
  }

  if (!items) return <CardSkeleton />
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="아직 추천한 게임이 없어요"
        description="해 보고 싶은 게임을 메모로 남겨 주세요"
        action={
          <Button size="sm" onClick={onAdd}>
            게임 추천하기
          </Button>
        }
      />
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const added = item.status === 'added'
        const mine = item.createdBy === uid
        return (
          <li key={item.id} className={cn('space-y-1.5 pixel-border bg-card p-3', added && 'opacity-70')}>
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 font-bold break-words">{item.name}</p>
              {added && <Badge variant="secondary">목록에 넣었음</Badge>}
            </div>
            {item.players && <p className="text-xs text-muted-foreground">{item.players}</p>}
            {item.note && <p className="text-sm whitespace-pre-wrap wrap-anywhere">{item.note}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <MemberName uid={item.createdBy} showTitle={false} />
              <span>{formatChatListTime(item.createdAt)}</span>
              <span className="ml-auto flex gap-1">
                {isOwner && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () => setSuggestionStatus(item.id, added ? 'open' : 'added'),
                        added ? '대기로 되돌렸어요' : '목록에 넣었다고 표시했어요',
                      )
                    }
                  >
                    {!added && <Check />}
                    {added ? '되돌리기' : '넣었음'}
                  </Button>
                )}
                {(mine || isOwner) && (
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label="추천 지우기"
                    onClick={() => void run(() => deleteSuggestion(item.id), '추천을 지웠어요')}
                  >
                    <Trash2 />
                  </Button>
                )}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
