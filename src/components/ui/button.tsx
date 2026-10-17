import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  // 픽셀 버튼: 진한 2px 테두리 + 흐림 없는 그림자, 누르면 그림자 위치로 쑥 들어간다(pixel-press). 상태는 부드럽게 바뀌지 않고 즉시
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-normal whitespace-nowrap outline-none pixel-focus pixel-press disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "pixel-border border-foreground/70 bg-primary text-primary-foreground pixel-shadow-sm hover:brightness-110",
        destructive:
          "pixel-border border-foreground/70 bg-destructive text-white pixel-shadow-sm hover:brightness-110",
        outline:
          "pixel-border border-foreground/70 bg-background pixel-shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "pixel-border border-foreground/70 bg-secondary text-secondary-foreground pixel-shadow-sm hover:brightness-95",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
