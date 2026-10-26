import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Badge kiểu frappe-ui — DESIGN.md §6: nền tô nhạt cùng màu chữ, không viền.
 * Trạng thái: `success` | `warning` | `destructive`; trung tính: `default` | `outline` | `secondary`;
 * `solid` (nền đen/trắng) dùng cho vai trò Quản trị.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground [a]:hover:bg-accent",
        secondary: "bg-secondary text-muted-foreground [a]:hover:text-foreground",
        outline: "border-border text-foreground [a]:hover:bg-secondary",
        solid: "bg-foreground text-background",
        success: "bg-success/12 text-success",
        warning: "bg-warning/14 text-warning",
        destructive: "bg-destructive/10 text-destructive",
        info: "bg-info/10 text-info",
        ghost: "text-muted-foreground hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
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
