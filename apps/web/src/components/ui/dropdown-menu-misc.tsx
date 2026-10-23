import * as React from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "cn";

function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof Primitive.Label> & { inset?: boolean }) {
  return <Primitive.Label data-slot="dropdown-menu-label" data-inset={inset}
    className={cn("px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase data-inset:pl-9.5",className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Primitive.Separator>) {
  return <Primitive.Separator data-slot="dropdown-menu-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border/50",className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",className)} {...props} />;
}

export { DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut };
