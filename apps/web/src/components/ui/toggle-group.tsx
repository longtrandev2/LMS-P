import * as React from "react"
import { cn } from "cn"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

/**
 * Nhóm nút chuyển kiểu segmented (giống `TabsList variant="default"` nhưng là lựa chọn giá trị).
 * `<ToggleGroup type="single" value={v} onValueChange={(x) => x && setV(x)}>`.
 */
function ToggleGroup({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & { size?: "sm" | "default" }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-size={size}
      className={cn(
        "group/toggle-group inline-flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5 data-[size=default]:h-9 data-[size=sm]:h-8",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-full items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-xs dark:data-[state=on]:bg-accent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
