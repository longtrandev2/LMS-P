import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/components/role-status-badges";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

function initialsOf(name?: string | null): string {
  return (name ?? "?").split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Menu tài khoản. `variant="avatar"`: nút tròn ở topbar; `variant="row"`: hàng tài khoản cuối sidebar.
 */
export function UserMenu({ variant = "avatar", onNavigate }: { variant?: "avatar" | "row"; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { user, refreshToken, clearSession } = useAuthStore();
  const avatarSrc = useAvatarUrl(user?.avatar_url);
  const roles = user?.roles.map((r) => ROLE_LABELS[r]).join(" · ");

  const handleLogout = async () => {
    try {
      // BE yêu cầu body {refresh_token} để revoke — không gửi sẽ 400
      if (refreshToken) await api.post("/auth/logout", { refresh_token: refreshToken });
    } catch {
      /* logout là best-effort — session local vẫn phải clear */
    }
    clearSession();
    navigate("/login", { replace: true });
  };

  const avatar = (
    <Avatar className="size-7">
      {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
      <AvatarFallback>{initialsOf(user?.full_name)}</AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tài khoản"
        className={cn(
          "flex items-center gap-2.5 rounded-md text-left outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent",
          variant === "row" ? "w-full p-1.5" : "p-0.5"
        )}
      >
        {avatar}
        {variant === "row" ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{user?.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{roles}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={variant === "row" ? "start" : "end"} side={variant === "row" ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{user?.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onNavigate?.(); navigate("/me/profile"); }}>
          <UserRound aria-hidden /> Hồ sơ của tôi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut aria-hidden /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
