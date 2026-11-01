import { Check } from "lucide-react";
import { ROLE_LABELS } from "@/components/role-status-badges";
import type { Role } from "@/types/api";
import { cn } from "@/lib/utils";

const ALL_ROLES: Role[] = ["admin", "lecturer", "student"];

export function UserRoleSelector({ roles, onChange, error }: {
  roles: Role[];
  onChange: (roles: Role[]) => void;
  error?: string;
}) {
  const toggle = (role: Role) => onChange(roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role]);
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-sm font-medium">Vai trò <span className="font-normal text-muted-foreground">· chọn một hoặc nhiều</span></legend>
      <div className="flex flex-wrap gap-2">
        {ALL_ROLES.map((role) => {
          const active = roles.includes(role);
          return <button key={role} type="button" aria-pressed={active} onClick={() => toggle(role)}
            className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {active ? <Check className="size-3.5" aria-hidden /> : null}
            {ROLE_LABELS[role]}
          </button>;
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}
