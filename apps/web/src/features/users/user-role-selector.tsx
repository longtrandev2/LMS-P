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
            className={cn("h-8 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {ROLE_LABELS[role]}
          </button>;
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}
