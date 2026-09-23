import type { Timestamp } from 'firebase/firestore'

/**
 * 게시판은 하나이고, 글마다 카테고리를 붙여 제목 앞에 태그처럼 보여준다.
 * Firestore 문서의 필드 이름은 예전 그대로 `board` 다 (이미 올라간 글을 고치지 않기 위해).
 */
export type PostCategory = 'notice' | 'free' | 'recommend' | 'review' | 'question'

/** posts/{postId} */
export type Post = {
  id: string
  /** 카테고리 (필드 이름은 `board`) */
  board: PostCategory
  title: string
  content: string
  authorId: string
  /** 글쓴이가 회원 목록에 없을 때(강퇴 등) 표시용 */
  authorNickname: string
  pinned: boolean
  likeIds: string[]
  commentCount: number
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

/** posts/{postId}/comments/{commentId} */
export type PostComment = {
  id: string
  authorId: string
  authorNickname: string
  content: string
  createdAt: Timestamp | null
}

/** 화면에 나오는 순서. id 는 저장되는 값이라 한 번 정하면 바꾸지 않는다 */
export const POST_CATEGORIES: { id: PostCategory; label: string; description: string }[] = [
  { id: 'notice', label: '공지', description: '오너가 올리는 안내' },
  { id: 'free', label: '자유', description: '아무 얘기나' },
  { id: 'recommend', label: '보드게임 추천', description: '해보고 좋았던 게임' },
  { id: 'review', label: '모임 후기', description: '모임에서 있었던 일' },
  { id: 'question', label: '질문', description: '규칙이든 뭐든 물어보기' },
]

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  notice: '공지',
  free: '자유',
  recommend: '보드게임 추천',
  review: '모임 후기',
  question: '질문',
}

export const isPostCategory = (value: string | null | undefined): value is PostCategory =>
  !!value && POST_CATEGORIES.some((item) => item.id === value)
