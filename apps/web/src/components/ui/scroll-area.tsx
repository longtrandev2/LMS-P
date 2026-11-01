import * as React from "react"
import { cn } from "cn"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

/** Vùng cuộn với thanh cuộn mảnh, đồng nhất giữa các trình duyệt. */
function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border hover:bg-input" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
