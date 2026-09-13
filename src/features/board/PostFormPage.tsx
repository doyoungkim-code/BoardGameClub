import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageSpinner } from '@/components/PageSpinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldError } from '@/features/auth/SignupPage'
import { toErrorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { canEditPost, canWriteTo, createPost, fetchPost, updatePost } from '@/services/posts'
import { useAuth, useIsOwner } from '@/stores/auth'
import { BOARDS, BOARD_LABEL, isBoardId, type BoardId, type Post } from '@/types/post'

const schema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요').max(100, '100자 이하로 입력해 주세요'),
  content: z.string().trim().min(1, '내용을 입력해 주세요').max(10000, '10000자 이하로 입력해 주세요'),
})

type FormValues = z.infer<typeof schema>

/** /posts/new 와 /posts/:postId/edit 을 함께 처리한다 */
export function PostFormPage() {
  const { postId } = useParams()
  const [post, setPost] = useState<Post | null | undefined>(postId ? undefined : null)

  useEffect(() => {
    if (!postId) return
    fetchPost(postId)
      .then(setPost)
      .catch((error) => {
        console.error('글 불러오기 실패', error)
        setPost(null)
      })
  }, [postId])

  if (post === undefined) return <PageSpinner />
  if (postId && !post) return <PostFormNotice text="글을 찾을 수 없어요" />
  return <PostForm post={post ?? undefined} />
}

function PostForm({ post }: { post?: Post }) {
  const profile = useAuth((s) => s.profile)!
  const isOwner = useIsOwner()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editing = !!post

  // 새 글은 쿼리스트링(?board=free)으로 게시판을 받고, 수정할 때는 바꿀 수 없다
  const requested = searchParams.get('board')
  const [board, setBoard] = useState<BoardId>(
    post?.board ?? (isBoardId(requested ?? undefined) ? (requested as BoardId) : 'free'),
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { title: post?.title ?? '', content: post?.content ?? '' },
  })

  if (editing && !canEditPost(post, profile.uid, isOwner)) return <PostFormNotice text="이 글을 수정할 권한이 없어요" />
  if (!editing && !canWriteTo(board, isOwner)) return <PostFormNotice text="공지는 오너만 쓸 수 있어요" />

  const onSubmit = async (values: FormValues) => {
    try {
      if (post) {
        await updatePost(post.id, values)
        toast.success('글을 수정했어요')
        navigate(`/posts/${post.id}`, { replace: true })
      } else {
        const id = await createPost({ uid: profile.uid, nickname: profile.nickname }, { ...values, board })
        toast.success('글을 올렸어요')
        navigate(`/posts/${id}`, { replace: true })
      }
    } catch (error) {
      console.error('글 저장 실패', error)
      toast.error(toErrorMessage(error))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild>
          <Link to={post ? `/posts/${post.id}` : `/board/${board}`} aria-label="뒤로">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{editing ? '글 수정' : '글쓰기'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label>게시판</Label>
          {editing ? (
            <div>
              <Badge variant="outline">{BOARD_LABEL[board]}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">게시판은 바꿀 수 없어요</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {BOARDS.filter((item) => canWriteTo(item.id, isOwner)).map((item) => (
                <button key={item.id} type="button" onClick={() => setBoard(item.id)} aria-pressed={board === item.id}>
                  <Badge
                    variant={board === item.id ? 'default' : 'outline'}
                    className={cn('cursor-pointer font-normal')}
                  >
                    {item.label}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">내용</Label>
          <Textarea id="content" rows={12} aria-invalid={!!errors.content} {...register('content')} />
          <FieldError message={errors.content?.message} />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
          {editing ? '저장' : '올리기'}
        </Button>
      </form>
    </div>
  )
}

function PostFormNotice({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-center">
      <p className="py-16 text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline">
        <Link to="/board/notice">게시판으로</Link>
      </Button>
    </div>
  )
}
