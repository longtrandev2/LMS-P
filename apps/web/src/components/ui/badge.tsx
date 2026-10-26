import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Badge chữ — DESIGN.md §6: viền 1px + chữ màu trạng thái trên nền 10% cùng màu.
 * Trạng thái: `success` | `warning` | `destructive`; trung tính: `default` | `outline` | `secondary`;
 * `solid` (nền đen/trắng) dùng cho vai trò Quản trị.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground [a]:hover:bg-accent",
        secondary: "border-transparent bg-muted text-muted-foreground [a]:hover:text-foreground",
        outline: "border-border text-foreground [a]:hover:bg-accent",
        solid: "border-transparent bg-foreground text-background",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        ghost: "border-transparent text-muted-foreground hover:text-foreground",
        link: "border-transparent text-foreground underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
