import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Nút kiểu frappe-ui — DESIGN.md §6. `default`/`cta`: đen đặc (hành động chính);
 * `outline`/`secondary`: xám đặc (hành động phụ); `ghost`: trong suốt (icon, menu); `destructive`: chỉ khi xóa.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        cta: "bg-cta text-cta-foreground hover:bg-cta/85",
        outline: "bg-secondary text-foreground hover:bg-accent aria-expanded:bg-accent",
        secondary: "bg-secondary text-foreground hover:bg-accent aria-expanded:bg-accent",
        ghost: "text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        link: "h-auto px-0 text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground",
      },
      size: {
        default: "h-8 px-3",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-7 px-2.5",
        lg: "h-9 px-4",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
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
