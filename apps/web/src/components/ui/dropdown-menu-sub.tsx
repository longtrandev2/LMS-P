import * as React from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";

function DropdownMenuSub(props: React.ComponentProps<typeof Primitive.Sub>) {
  return <Primitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof Primitive.SubTrigger> & { inset?: boolean }) {
  return (
    <Primitive.SubTrigger data-slot="dropdown-menu-sub-trigger" data-inset={inset}
      className={cn("flex cursor-default items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-9.5 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",className)} {...props}>
      {children}<ChevronRightIcon className="ml-auto" />
    </Primitive.SubTrigger>
  );
}

function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof Primitive.SubContent>) {
  return <Primitive.SubContent data-slot="dropdown-menu-sub-content" className={cn("z-50 min-w-36 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",className)} {...props} />;
}

export { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent };
