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
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Vai trò</legend>
      <div className="flex flex-wrap gap-2">
        {ALL_ROLES.map((role) => {
          const active = roles.includes(role);
          return <button key={role} type="button" aria-pressed={active} onClick={() => toggle(role)}
            className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors duration-200",
              active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
            {ROLE_LABELS[role]}
          </button>;
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}
