import * as React from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "cn";

function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof Primitive.Label> & { inset?: boolean }) {
  return <Primitive.Label data-slot="dropdown-menu-label" data-inset={inset}
    className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground data-inset:pl-8", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto font-mono text-xs text-muted-foreground", className)} {...props} />;
}

export { DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut };
