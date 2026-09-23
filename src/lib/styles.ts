/**
 * 여러 화면에서 같이 쓰는 클래스 묶음.
 *
 * 누르는 표시(`active:`)는 **누른 요소와 그 위쪽**에만 걸린다. 카드가 <Link> 안에 들어 있으면
 * 카드에 `active:` 를 줘도 반응하지 않는다. 그래서 링크에 `group` 을 붙이고 카드에는 `group-active:` 를 쓴다.
 * (index.css 에서 기본 탭 하이라이트를 껐기 때문에 이 표시가 유일한 누름 반응이다)
 */

/** <Link className="group"> 안의 카드에 */
export const tappableCard = 'transition-colors group-hover:border-primary/40 group-active:bg-accent'

/** 행 자체가 링크·버튼일 때 */
export const tappableRow = 'transition-colors hover:bg-muted active:bg-accent'
