import { useEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Size = { w: number; h: number }

type Props = {
  /** 장면 높이 (도트) */
  height: number
  /** 도트 하나의 화면 크기(CSS px). 너비는 화면에 맞춰 이 크기로 나눠 정한다 */
  pixel?: number
  /** 초당 그리는 횟수. 도트 애니메이션은 12 정도가 자연스럽고 배터리도 아낀다 */
  fps?: number
  /** 한 프레임 그리기. t = 초, frame = 프레임 번호 */
  draw: (ctx: CanvasRenderingContext2D, size: Size, t: number, frame: number) => void
  /** 장면을 눌렀을 때 (도트 좌표) */
  onPress?: (x: number, y: number) => void
  /** 화면 읽기용 설명 */
  label: string
  className?: string
  style?: CSSProperties
}

/**
 * 코드로 그리는 도트 장면을 담는 캔버스.
 * - 캔버스 1칸 = 도트 1개로 그리고, CSS 로 정수배 키운다(image-rendering: pixelated) → 흐림 없음
 * - 화면 밖으로 스크롤되거나 앱이 뒤로 가면 멈춘다 (배터리)
 * - 기기에서 '동작 줄이기'를 켰으면 한 장만 그리고 멈춘다
 */
export function PixelCanvas({ height, pixel = 3, fps = 12, draw, onPress, label, className, style }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 그리기 함수는 매 렌더 바뀔 수 있어서 ref 로 최신 것을 쓴다 (루프를 다시 만들지 않게)
  const drawRef = useRef(draw)
  // 그리기 함수가 바뀌면(장면 상태가 바뀌면) 루프를 기다리지 않고 바로 한 번 그린다 ('동작 줄이기'일 때도 결과가 보이게)
  const paintRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    drawRef.current = draw
    paintRef.current?.()
  }, [draw])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let raf = 0
    let visible = true
    let last = 0
    let frame = 0
    const start = performance.now()

    const paint = () => {
      if (width === 0) return
      drawRef.current(ctx, { w: width, h: height }, (performance.now() - start) / 1000, frame)
    }

    paintRef.current = paint

    const resize = () => {
      const next = Math.max(1, Math.floor(wrap.clientWidth / pixel))
      if (next === width) return
      width = next
      canvas.width = width
      canvas.height = height
      canvas.style.width = `${width * pixel}px`
      canvas.style.height = `${height * pixel}px`
      ctx.imageSmoothingEnabled = false
      paint()
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / fps) return
      last = now
      frame++
      paint()
    }
    const run = () => {
      cancelAnimationFrame(raf)
      if (!reduceMotion && visible && document.visibilityState === 'visible') raf = requestAnimationFrame(loop)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      run()
    })
    io.observe(wrap)
    document.addEventListener('visibilitychange', run)
    resize()
    run()

    return () => {
      paintRef.current = null
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', run)
    }
  }, [height, pixel, fps])

  return (
    <div ref={wrapRef} className={cn('flex justify-center overflow-hidden', className)} style={style}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={cn('pixel-crisp block', onPress && 'cursor-pointer')}
        onClick={
          onPress
            ? (e) => {
                const box = e.currentTarget.getBoundingClientRect()
                onPress(
                  Math.floor(((e.clientX - box.left) / box.width) * e.currentTarget.width),
                  Math.floor(((e.clientY - box.top) / box.height) * e.currentTarget.height),
                )
              }
            : undefined
        }
      />
    </div>
  )
}
