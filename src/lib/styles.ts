/**
 * 여러 화면에서 같이 쓰는 클래스 묶음.
 *
 * 누르는 표시(`active:`)는 **누른 요소와 그 위쪽**에만 걸린다. 카드가 <Link> 안에 들어 있으면
 * 카드에 `active:` 를 줘도 반응하지 않는다. 그래서 링크에 `group` 을 붙이고 카드에는 `group-active:` 를 쓴다.
 * (index.css 에서 기본 탭 하이라이트를 껐기 때문에 이 표시가 유일한 누름 반응이다)
 *
 * 픽셀 UI 라 부드럽게 바뀌지 않고 즉시 바뀐다. 카드는 눌리면 그림자 자리로 2px 들어간다(버튼의 pixel-press 와 같은 느낌)
 */

/** <Link className="group"> 안의 카드에 */
export const tappableCard =
  'group-hover:border-primary group-active:translate-x-0.5 group-active:translate-y-0.5 group-active:bg-accent group-active:shadow-none'

/** 행 자체가 링크·버튼일 때 */
export const tappableRow = 'hover:bg-muted active:bg-accent'
