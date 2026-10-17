import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GameSuggestion } from '@/types/gameSuggestion'

/** 게임 추천 메모 (규칙: firestore.rules 의 gameSuggestions) */
const suggestionsCol = collection(db, 'gameSuggestions')

export const toSuggestion = (snap: DocumentSnapshot) =>
  ({ id: snap.id, ...snap.data({ serverTimestamps: 'estimate' }) }) as GameSuggestion

/** 최신순 (한 필드 정렬이라 색인이 필요 없다) */
export const suggestionsQuery = query(suggestionsCol, orderBy('createdAt', 'desc'))

export type SuggestionInput = { name: string; players: string; note: string }

export function addSuggestion(uid: string, input: SuggestionInput) {
  return addDoc(suggestionsCol, { ...input, createdBy: uid, createdAt: serverTimestamp(), status: 'open' })
}

/** 오너: 목록에 넣었음 / 다시 대기로 */
export function setSuggestionStatus(id: string, status: GameSuggestion['status']) {
  return updateDoc(doc(suggestionsCol, id), { status })
}

/** 쓴 사람·오너 */
export function deleteSuggestion(id: string) {
  return deleteDoc(doc(suggestionsCol, id))
}
