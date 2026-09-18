import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { EllipsisVertical, Heart, Pin, Send } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageSpinner } from '@/components/PageSpinner'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, formatRelative, toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  addComment,
  canEditPost,
  commentsQuery,
  deletePost,
  postRef,
  removeComment,
  setLiked,
  setPinned,
  toComment,
  toPost,
} from '@/services/posts'
import { useAuth, useIsOwner } from '@/stores/auth'
import { useMembers } from '@/stores/members'
import { BOARD_LABEL, type Post, type PostComment } from '@/types/post'

export function PostDetailPage() {
  const { postId } = useParams()
  const [post, setPost] = useState<Post | null | undefined>(undefined)

  useEffect(() => {
    if (!postId) return
    // 좋아요·댓글 수가 실시간으로 바뀐다
    return onSnapshot(
      postRef(postId),
      (snap) => setPost(snap.exists() ? toPost(snap) : null),
      (error) => {
        console.error('글 구독 실패', error)
        setPost(null)
      },
    )
  }, [postId])

  if (post === undefined) return <PageSpinner />
  if (!post) {
    return (
      <div className="space-y-4 text-center">
        <p className="py-16 text-sm text-muted-foreground">글을 찾을 수 없어요</p>
        <Button asChild variant="outline">
          <Link to="/board/notice">게시판으로</Link>
        </Button>
      </div>
    )
  }
  return <PostDetail post={post} />
}

function PostDetail({ post }: { post: Post }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const membersById = useMembers((s) => s.byId)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const editable = canEditPost(post, profile.uid, isOwner)
  const liked = post.likeIds.includes(profile.uid)
  const author = membersById[post.authorId]
  const edited = post.updatedAt && post.createdAt && post.updatedAt.toMillis() - post.createdAt.toMillis() > 1000

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } catch (error) {
      console.error('글 처리 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <BackButton fallback={`/board/${post.board}`} />
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <Badge variant={post.board === 'notice' ? 'default' : 'outline'}>{BOARD_LABEL[post.board]}</Badge>
          {post.pinned && (
            <Badge variant="secondary" className="gap-1">
              <Pin className="size-3" />
              고정
            </Badge>
          )}
        </div>
        {(editable || isOwner) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="글 관리">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editable && (
                <DropdownMenuItem asChild>
                  <Link to={`/posts/${post.id}/edit`}>수정</Link>
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem onSelect={() => void run(() => setPinned(post.id, !post.pinned))}>
                  {post.pinned ? '고정 해제' : '맨 위에 고정'}
                </DropdownMenuItem>
              )}
              {editable && (
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{post.title}</h1>
        <div className="flex items-center gap-2">
          <UserAvatar
            name={author?.nickname ?? post.authorNickname}
            photoURL={author?.photoURL ?? null}
            className="size-8"
          />
          <div className="text-xs">
            <p className="font-medium">{author?.nickname ?? post.authorNickname}</p>
            <p className="text-muted-foreground">
              {formatDateTime(post.createdAt)}
              {edited && ' (수정됨)'}
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

      <Button
        variant={liked ? 'default' : 'outline'}
        className="w-full"
        disabled={busy}
        onClick={() => void run(() => setLiked(post.id, profile.uid, !liked))}
      >
        <Heart className={cn('size-4', liked && 'fill-current')} />
        좋아요 {post.likeIds.length > 0 && post.likeIds.length}
      </Button>

      <Comments postId={post.id} count={post.commentCount} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="글을 삭제할까요?"
        description="댓글도 함께 보이지 않게 돼요."
        confirmLabel="삭제"
        destructive
        onConfirm={() =>
          run(async () => {
            await deletePost(post.id)
            toast.success('글을 삭제했어요')
            navigate(`/board/${post.board}`, { replace: true })
          })
        }
      />
    </div>
  )
}

function Comments({ postId, count }: { postId: string; count: number }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const membersById = useMembers((s) => s.byId)
  const [comments, setComments] = useState<PostComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [removing, setRemoving] = useState<PostComment | null>(null)

  useEffect(
    () =>
      onSnapshot(
        commentsQuery(postId),
        (snap) => setComments(snap.docs.map(toComment)),
        (error) => {
          console.error('댓글 구독 실패', error)
          setComments([])
        },
      ),
    [postId],
  )

  const send = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      await addComment(postId, { uid: profile.uid, nickname: profile.nickname }, content)
      setDraft('')
    } catch (error) {
      console.error('댓글 작성 실패', error)
      toast.error(toErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="space-y-3 border-t pt-5">
      <h2 className="font-semibold">댓글 {count > 0 && count}</h2>

      {comments === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중…</p>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">첫 댓글을 남겨보세요</p>
      ) : (
        <ul className="divide-y">
          {comments.map((comment) => {
            const member = membersById[comment.authorId]
            const removable = comment.authorId === profile.uid || isOwner
            return (
              <li key={comment.id} className="flex gap-2.5 py-3">
                <UserAvatar
                  name={member?.nickname ?? comment.authorNickname}
                  photoURL={member?.photoURL ?? null}
                  className="size-8 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{member?.nickname ?? comment.authorNickname}</span>
                    <span className="text-muted-foreground">{formatRelative(comment.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
                {removable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setRemoving(comment)}
                  >
                    삭제
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // PC에서는 Enter로 등록, 줄바꿈은 Shift+Enter
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void send()
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder="댓글 달기"
          aria-label="댓글 입력"
          className="min-h-0 resize-none"
        />
        <Button size="icon" className="size-10 shrink-0" disabled={!draft.trim() || sending} onClick={() => void send()}>
          <Send className="size-4" />
          <span className="sr-only">등록</span>
        </Button>
      </div>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="댓글을 삭제할까요?"
        confirmLabel="삭제"
        destructive
        onConfirm={async () => {
          if (!removing) return
          try {
            await removeComment(postId, removing.id)
          } catch (error) {
            console.error('댓글 삭제 실패', error)
            toast.error(toErrorMessage(error))
          }
        }}
      />
    </section>
  )
}
