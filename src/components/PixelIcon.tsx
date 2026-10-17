import type { SVGProps } from 'react'
import { PIXEL_ICONS, type PixelIconName } from '@/data/pixelIcons'
import { cn } from '@/lib/utils'

export type PixelIconProps = Omit<SVGProps<SVGSVGElement>, 'ref' | 'name'>

/**
 * 24칸 격자 그림은 12px·24px 에서만 또렷하다(2칸 = 1px 또는 2px). 화면 코드가 예전처럼 size-4(16px)·size-5(20px) 를
 * 줘도 가까운 또렷한 크기로 맞춘다. 크기 규칙을 바꾸려면 여기만 고친다
 */
function snapSize(className: string | undefined) {
  return className?.replace(/\bsize-(?:3\.5|4)\b/g, 'size-3').replace(/\bsize-5\b/g, 'size-6')
}

/**
 * 픽셀 아이콘 하나 (src/data/pixelIcons.ts). 색은 글자색(currentColor)을 따라가고, 크기는 size-* 로 정한다.
 * width/height 속성은 기본값일 뿐이라 부모의 [&_svg]:size-* 같은 CSS 가 이긴다
 */
export function PixelIcon({ name, className, ...props }: PixelIconProps & { name: PixelIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="currentColor"
      // 흐릿한 중간색 픽셀을 만들지 않는다
      shapeRendering="crispEdges"
      aria-hidden={props['aria-label'] ? undefined : true}
      className={cn('shrink-0', snapSize(className))}
      {...props}
    >
      <path d={PIXEL_ICONS[name]} />
    </svg>
  )
}

/** 로딩 표시: 돌리면 픽셀이 뭉개져서, 네모 3개가 차례로 켜진다 (index.css 의 pixel-loader) */
export function PixelLoader({ className }: { className?: string }) {
  return (
    <span className={cn('pixel-loader inline-flex gap-1 text-muted-foreground', className)} role="status" aria-label="불러오는 중">
      <i />
      <i />
      <i />
    </span>
  )
}
