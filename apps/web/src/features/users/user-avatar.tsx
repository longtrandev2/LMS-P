import { cn } from "@/lib/utils";

/** Hai chữ cái cuối của họ tên — "Nguyễn Văn B" → "VB". */
export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
  xl: "size-20 text-xl",
} as const;

/** Avatar tròn: ảnh nếu có, ngược lại chữ cái đầu trên nền xám (kiểu frappe-ui). */
export function UserAvatar({ name, src, size = "md", isOnline, className }: {
  name: string; src?: string | null; size?: keyof typeof SIZES; isOnline?: boolean; className?: string;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-semibold text-secondary-foreground select-none",
          SIZES[size],
          className,
        )}
      >
        {src ? <img src={src} alt="" className="size-full object-cover" /> : initialsOf(name)}
      </span>
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-background",
            size === "sm" ? "size-2" : size === "lg" || size === "xl" ? "size-3" : "size-2.5",
            isOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
          )}
          title={isOnline ? "Trực tuyến" : "Ngoại tuyến"}
        />
      )}
    </span>
  );
}

/** Ô "người dùng" trong bảng/danh sách: avatar + họ tên 14/500 + email xám. */
export function UserIdentity({ name, email, src, isOnline, className }: {
  name: string; email?: string | null; src?: string | null; isOnline?: boolean; className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <UserAvatar name={name} src={src} isOnline={isOnline} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {email ? <span className="block max-w-64 truncate text-xs text-muted-foreground">{email}</span> : null}
      </span>
    </span>
  );
}