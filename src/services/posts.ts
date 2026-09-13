import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BoardId, Post, PostComment } from '@/types/post'

export const POST_PAGE_SIZE = 20

export const postsCol = collection(db, 'posts')

export const postRef = (postId: string) => doc(postsCol, postId)

export const commentsCol = (postId: string) => collection(postRef(postId), 'comments')

export const toPost = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as Post

export const toComment = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as PostComment

// 고정 글을 위로 올리고 최신순. firestore.indexes.json 의 posts 색인이 필요하다.
const boardQuery = (board: BoardId) => [
  where('board', '==', board),
  orderBy('pinned', 'desc'),
  orderBy('createdAt', 'desc'),
]

export function fetchPosts(board: BoardId, cursor?: QueryDocumentSnapshot) {
  return getDocs(
    cursor
      ? query(postsCol, ...boardQuery(board), startAfter(cursor), limit(POST_PAGE_SIZE))
      : query(postsCol, ...boardQuery(board), limit(POST_PAGE_SIZE)),
  )
}

/** 홈에 보여줄 공지 몇 개 (고정 글이 먼저 온다) */
export function fetchTopNotices(count: number) {
  return getDocs(query(postsCol, ...boardQuery('notice'), limit(count)))
}

export async function fetchPost(postId: string) {
  const snap = await getDoc(postRef(postId))
  return snap.exists() ? toPost(snap) : null
}

export const commentsQuery = (postId: string) => query(commentsCol(postId), orderBy('createdAt', 'asc'))

// ---------- 글 ----------

export type PostInput = { board: BoardId; title: string; content: string }

export function createPost(author: { uid: string; nickname: string }, input: PostInput) {
  const ref = doc(postsCol)
  return setDoc(ref, {
    ...input,
    authorId: author.uid,
    authorNickname: author.nickname,
    pinned: false,
    likeIds: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then(() => ref.id)
}

/** 게시판 이동은 rules 가 막는다 */
export function updatePost(postId: string, input: Omit<PostInput, 'board'>) {
  return updateDoc(postRef(postId), { ...input, updatedAt: serverTimestamp() })
}

export function deletePost(postId: string) {
  return deleteDoc(postRef(postId))
}

export function setPinned(postId: string, pinned: boolean) {
  return updateDoc(postRef(postId), { pinned })
}

export function setLiked(postId: string, uid: string, liked: boolean) {
  return updateDoc(postRef(postId), { likeIds: liked ? arrayUnion(uid) : arrayRemove(uid) })
}

// ---------- 댓글 ----------
// 댓글 수는 rules 가 +1/-1 만 허용하므로 댓글 문서와 같은 batch 로 갱신한다

export function addComment(postId: string, author: { uid: string; nickname: string }, content: string) {
  const batch = writeBatch(db)
  batch.set(doc(commentsCol(postId)), {
    authorId: author.uid,
    authorNickname: author.nickname,
    content,
    createdAt: serverTimestamp(),
  })
  batch.update(postRef(postId), { commentCount: increment(1) })
  return batch.commit()
}

export function updateComment(postId: string, commentId: string, content: string) {
  return updateDoc(doc(commentsCol(postId), commentId), { content })
}

export function removeComment(postId: string, commentId: string) {
  const batch = writeBatch(db)
  batch.delete(doc(commentsCol(postId), commentId))
  batch.update(postRef(postId), { commentCount: increment(-1) })
  return batch.commit()
}

// ---------- 화면에서 같이 쓰는 계산 ----------

export const canEditPost = (post: Post, uid: string, isOwner: boolean) => post.authorId === uid || isOwner

export const canWriteTo = (board: BoardId, isOwner: boolean) => board !== 'notice' || isOwner
