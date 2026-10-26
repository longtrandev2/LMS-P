import { useNavigate } from "react-router-dom";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { ROLE_LABELS } from "@/components/role-status-badges";

/** Menu tài khoản ở header shell: xem hồ sơ, đăng xuất (revoke refresh token) */
export function UserMenu() {
  const navigate = useNavigate();
  const { user, refreshToken, clearSession } = useAuthStore();

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2.5 px-2 py-1.5 font-normal data-[state=open]:bg-accent"
          aria-label="Menu tài khoản"
        >
          <UserAvatar fullName={user?.full_name} avatarUrl={user?.avatar_url} />
          <span className="hidden max-w-40 truncate text-sm sm:block">
            {user?.full_name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{user?.full_name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
          <p className="mt-1 text-xs font-normal text-muted-foreground">
            {user?.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/me/profile")}>
          <UserRound aria-hidden /> Hồ sơ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut aria-hidden /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
