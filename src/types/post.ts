import type { Timestamp } from 'firebase/firestore'

export type BoardId = 'notice' | 'free' | 'review'

/** posts/{postId} */
export type Post = {
  id: string
  board: BoardId
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

export const BOARDS: { id: BoardId; label: string; description: string }[] = [
  { id: 'notice', label: '공지', description: '오너가 올리는 안내' },
  { id: 'free', label: '자유', description: '아무 얘기나' },
  { id: 'review', label: '후기', description: '플레이 후기와 추천' },
]

export const BOARD_LABEL: Record<BoardId, string> = {
  notice: '공지',
  free: '자유',
  review: '후기',
}

export const isBoardId = (value: string | undefined): value is BoardId =>
  value === 'notice' || value === 'free' || value === 'review'
