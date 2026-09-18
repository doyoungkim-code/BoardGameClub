import { useCallback, useEffect, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { Heart, MessageSquare, Pin, Plus } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { MemberName } from '@/components/MemberName'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatChatListTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { canWriteTo, fetchPosts, POST_PAGE_SIZE, toPost } from '@/services/posts'
import { useIsOwner } from '@/stores/auth'
import { BOARDS, isBoardId, type BoardId, type Post } from '@/types/post'

export function BoardPage() {
  const { board } = useParams()
  if (!isBoardId(board)) return <Navigate to="/board/notice" replace />
  // 게시판을 옮기면 목록 상태를 새로 만든다
  return <Board key={board} board={board} />
}

function Board({ board }: { board: BoardId }) {
  const isOwner = useIsOwner()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  // 첫 페이지
  useEffect(() => {
    let canceled = false
    fetchPosts(board)
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
  }, [board])

  // 더 보기
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    try {
      const snap = await fetchPosts(board, cursor)
      setPosts((prev) => [...(prev ?? []), ...snap.docs.map(toPost)])
      setCursor(snap.docs.at(-1) ?? null)
      setHasMore(snap.docs.length === POST_PAGE_SIZE)
    } catch (error) {
      console.error('글 목록 불러오기 실패', error)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [board, cursor, loading])

  const writable = canWriteTo(board, isOwner)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">게시판</h1>
        {writable && (
          <Button asChild size="sm">
            <Link to={`/posts/new?board=${board}`}>
              <Plus className="size-4" />
              글쓰기
            </Link>
          </Button>
        )}
      </div>

      <nav className="flex gap-1 rounded-lg bg-muted p-1">
        {BOARDS.map((item) => (
          <Link
            key={item.id}
            to={`/board/${item.id}`}
            className={cn(
              'flex-1 rounded-md py-1.5 text-center text-sm transition-colors',
              item.id === board ? 'bg-background font-semibold shadow-xs' : 'text-muted-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {posts === null ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : posts.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          {board === 'notice' ? '아직 공지가 없어요' : '첫 글을 남겨보세요'}
        </p>
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

function PostRow({ post }: { post: Post }) {
  return (
    <Link to={`/posts/${post.id}`} className="block">
      <Card className="py-3 transition-colors hover:border-primary/40">
        <CardContent className="space-y-1.5 px-4">
          <div className="flex items-center gap-1.5">
            {post.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
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
