import { Navigate, useParams } from 'react-router'
import { isPostCategory } from '@/types/post'

/** 게시판을 하나로 합치기 전 주소(/board/free) → /board?c=free */
export function BoardRedirect() {
  const { board } = useParams()
  return <Navigate to={isPostCategory(board) ? `/board?c=${board}` : '/board'} replace />
}
