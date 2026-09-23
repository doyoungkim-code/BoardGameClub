import { useEffect, useRef, useState } from 'react'

/**
 * 화면을 조금이라도 내렸는지 (헤더에 테두리·그림자를 줄 때 쓴다).
 *
 * 스크롤할 때마다 다시 그리지 않도록, 맨 위에 둔 1px 짜리 표시(sentinel)가 화면에서 벗어났는지만 본다.
 * 스크롤 위치 숫자가 필요해지면 그때 scroll 이벤트 + requestAnimationFrame 으로 바꾸면 된다
 */
export function useScrolled() {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const target = sentinelRef.current
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 1 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return { scrolled, sentinelRef }
}
