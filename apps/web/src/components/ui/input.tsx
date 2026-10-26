import * as React from "react"
import { cn } from "cn"

/** Ô nhập kiểu frappe-ui — nền xám, focus chuyển nền trắng + vòng (DESIGN.md §6). */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md px-2.5 py-1 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground border border-transparent bg-secondary text-sm transition-[color,background-color,border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground hover:bg-accent focus-visible:border-input focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
    />
  )
}

export { Input }
