import { arrayUnion, doc, increment, updateDoc } from 'firebase/firestore'
import type { ShopItem } from '@/data/shopItems'
import { db } from '@/lib/firebase'

/**
 * 코인 상점 (규칙: firestore.rules 의 validPurchase / validEquip).
 * 사기: 가격만큼 코인을 빼고 가진 목록 끝에 붙인다. 규칙이 가격표와 비교해 검사한다
 */
export function buyItem(uid: string, item: ShopItem) {
  return updateDoc(doc(db, 'users', uid), {
    coins: increment(-item.price),
    items: arrayUnion(item.id),
    lastPurchase: item.id,
  })
}

/** 배너에 달기 (null 이면 떼기) */
export function equipItem(uid: string, kind: ShopItem['kind'], itemId: string | null) {
  return updateDoc(doc(db, 'users', uid), {
    [kind === 'background' ? 'bannerBackground' : 'bannerProp']: itemId,
  })
}
