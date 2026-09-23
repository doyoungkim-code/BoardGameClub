import { useCallback, useEffect, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { Heart, MessageSquare, Pin, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { MemberName } from '@/components/MemberName'
import { PageHeader } from '@/components/PageHeader'
import { CardSkeleton } from '@/components/Skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryTag } from '@/features/board/CategoryTag'
import { formatChatListTime } from '@/lib/format'
import { tappableCard } from '@/lib/styles'
import { cn } from '@/lib/utils'
import { canWriteTo, fetchPosts, POST_PAGE_SIZE, toPost } from '@/services/posts'
import { useIsOwner } from '@/stores/auth'
import { CATEGORY_LABEL, isPostCategory, POST_CATEGORIES, type Post, type PostCategory } from '@/types/post'

/** 게시판은 하나. 카테고리는 주소(?c=free)로 고른다 → 뒤로가기로 전체 보기로 돌아온다 */
export function BoardPage() {
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('c')
  const category = isPostCategory(requested) ? requested : null
  // 카테고리를 옮기면 목록 상태를 새로 만든다
  return <Board key={category ?? 'all'} category={category} />
}

function Board({ category }: { category: PostCategory | null }) {
  const isOwner = useIsOwner()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  // 첫 페이지
  useEffect(() => {
    let canceled = false
    fetchPosts(category)
      .then((snap) => {
        if (canceled) return
        setPosts(snap.docs.map(toPost))
        setCursor(snap.docs.at(-1) ?? null)
        setHasMore(snap.docs.length === POST_PAGE_SIZE)
      })
      .catch((error) => {
        console.error('글 목록 불러오기 실패', error)
        if (!canceled) setPosts([])
      })
    return () => {
      canceled = true
    }
  }, [category])

  // 더 보기
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    try {
      const snap = await fetchPosts(category, cursor)
      setPosts((prev) => [...(prev ?? []), ...snap.docs.map(toPost)])
      setCursor(snap.docs.at(-1) ?? null)
      setHasMore(snap.docs.length === POST_PAGE_SIZE)
    } catch (error) {
      console.error('글 목록 불러오기 실패', error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [category, cursor, loading])

  // 공지만 오너 전용이라, 공지 칸에서 회원에게는 글쓰기 버튼을 감춘다
  const writable = !category || canWriteTo(category, isOwner)
  const writeTo = `/posts/new${category ? `?c=${category}` : ''}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="게시판"
        actions={
          writable && (
            <Button asChild size="sm">
              <Link to={writeTo}>
                <Plus className="size-4" />
                글쓰기
              </Link>
            </Button>
          )
        }
      />

      {/* 카테고리 고르기. 넘치면 옆으로 밀어서 본다 */}
      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        <CategoryTab to="/board" label="전체" on={!category} />
        {POST_CATEGORIES.map((item) => (
          <CategoryTab key={item.id} to={`/board?c=${item.id}`} label={item.label} on={category === item.id} />
        ))}
      </nav>

      {posts === null ? (
        <CardSkeleton className="h-20" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={category ? `${CATEGORY_LABEL[category]} 글이 아직 없어요` : '아직 글이 없어요'}
          description={writable ? '첫 글을 남겨보세요' : '공지는 오너만 올릴 수 있어요'}
          action={
            writable && (
              <Button asChild size="sm">
                <Link to={writeTo}>글쓰기</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
          {hasMore && (
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => void loadMore()}>
              더 보기
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function CategoryTab({ to, label, on }: { to: string; label: string; on: boolean }) {
  return (
    <Link
      to={to}
      replace
      aria-current={on ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
        on ? 'border-primary bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground active:bg-muted',
      )}
    >
      {label}
    </Link>
  )
}

function PostRow({ post }: { post: Post }) {
  return (
    <Link to={`/posts/${post.id}`} className="group block">
      <Card className={`py-3 ${tappableCard}`}>
        <CardContent className="space-y-1.5 px-4">
          <div className="flex items-center gap-1.5">
            {post.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
            <CategoryTag category={post.board} />
            <p className="min-w-0 flex-1 truncate font-semibold">{post.title}</p>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.content}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <MemberName uid={post.authorId} fallback={post.authorNickname} showTitle={false} />
            <span>{formatChatListTime(post.createdAt)}</span>
            {post.likeIds.length > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="size-3" />
                {post.likeIds.length}
              </span>
            )}
            {post.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3" />
                {post.commentCount}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
