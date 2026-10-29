import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoMark } from "@/components/logo";
import { useTheme, type ThemeMode } from "@/components/theme-provider";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
];

function initialsOf(name?: string | null): string {
  return (name ?? "?").split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Đầu sidebar kiểu Frappe LMS: logo + tên hệ thống + người dùng; bấm mở menu hồ sơ / giao diện / đăng xuất.
 * `collapsed`: chỉ hiện logo (sidebar thu gọn).
 */
export function UserMenu({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { user, refreshToken, clearSession } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const avatarSrc = useAvatarUrl(user?.avatar_url);

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
            <DropdownMenuTrigger
        aria-label="Tài khoản và cài đặt"
        className="flex items-center gap-2 rounded-full p-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-8">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
          <AvatarFallback>{initialsOf(user?.full_name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium sm:inline-block max-w-[120px] truncate">
          {user?.full_name}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground hidden sm:inline-block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2.5 font-normal">
          <Avatar className="size-8">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
            <AvatarFallback>{initialsOf(user?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{user?.full_name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onNavigate?.(); navigate("/me/profile"); }}>
          <UserRound aria-hidden /> Hồ sơ của tôi
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Giao diện</DropdownMenuLabel>
        {THEMES.map((item) => (
          <DropdownMenuItem key={item.value} onClick={() => setTheme(item.value)}>
            <item.icon aria-hidden /> {item.label}
            {theme === item.value ? <Check className="ml-auto" aria-label="Đang chọn" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut aria-hidden /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
