import { useTheme } from "@/components/theme-provider";
import { CheckIcon, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Hệ thống", icon: Monitor },
] as const;

/** Đổi theme kèm transition mượt — gắn tạm class vào <html> (xem globals.css). */
function switchTheme(value: "light" | "dark" | "system", setTheme: (v: "light" | "dark" | "system") => void) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  setTheme(value);
  window.setTimeout(() => root.classList.remove("theme-transition"), 250);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Icon trigger đổi bằng CSS variant (dark:) nên không lệch hydration;
  // phần tử check chỉ render khi dropdown mở (client-side) nên đọc theme an toàn.
  const current = theme ?? "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Đổi giao diện sáng/tối"
          className={cn("relative", className)}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform duration-200 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform duration-200 dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => switchTheme(option.value, setTheme)}
          >
            <option.icon aria-hidden />
            {option.label}
            {current === option.value ? (
              <CheckIcon className="ml-auto text-gold" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
