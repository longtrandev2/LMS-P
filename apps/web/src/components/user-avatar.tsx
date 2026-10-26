import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Endpoint avatar yêu cầu Bearer token nên không thể dùng <img src> trực tiếp —
 * fetch blob rồi tạo object URL. 404/lỗi → để AvatarFallback hiện chữ cái tên.
 */
export function useAvatarObjectUrl(avatarUrl?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    let objectUrl: string | null = null;
    setUrl(null);
    if (!avatarUrl) return;
    // BE trả path tuyệt đối "/api/v1/..." — bỏ tiền tố để ghép với BASE_URL
    const path = avatarUrl.replace(/^\/api\/v1/, "");
    api
      .download(path)
      .then(({ blob }) => {
        if (stale || blob.size === 0) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        /* chưa có ảnh — fallback chữ cái */
      });
    return () => {
      stale = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl]);

  return url;
}

/** Chữ cái đầu của 2 âm cuối trong họ tên (vd "Nguyễn Văn An" → "VA") */
export function initialsOf(fullName?: string | null): string {
  return (fullName ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

interface UserAvatarProps {
  fullName?: string | null;
  avatarUrl?: string | null;
  /** Class override kích thước/viền (vd "size-24 text-2xl") */
  className?: string;
  fallbackClassName?: string;
}

/** Avatar người dùng kèm ảnh thật (nếu có) — dùng chung header shell và trang hồ sơ */
export function UserAvatar({
  fullName,
  avatarUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const objectUrl = useAvatarObjectUrl(avatarUrl);
  return (
    <Avatar className={cn("bg-muted", className)}>
      {objectUrl ? <AvatarImage src={objectUrl} alt={fullName ?? "Ảnh đại diện"} /> : null}
      <AvatarFallback
        className={cn(
          "bg-cta/10 font-semibold text-cta",
          fallbackClassName
        )}
      >
        {initialsOf(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
