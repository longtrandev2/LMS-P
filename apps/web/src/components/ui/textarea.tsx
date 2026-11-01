import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full resize-y rounded-md px-2.5 py-2 border border-transparent bg-secondary text-sm transition-[color,background-color,border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground hover:bg-accent focus-visible:border-input focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
