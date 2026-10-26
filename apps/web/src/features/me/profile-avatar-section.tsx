import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import type { SelfUserView } from "@/types/api";
import { useRefreshMe } from "./use-refresh-me";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB theo giới hạn BE

/** Khối ảnh đại diện ở trang hồ sơ: avatar lớn + tải lên / xóa (FR-AUTH-03) */
export function ProfileAvatarSection({
  fullName,
  avatarUrl,
}: {
  fullName?: string | null;
  avatarUrl?: string | null;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const refreshMe = useRefreshMe();
  const [busy, setBusy] = useState(false);

  async function handleUpload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ảnh tối đa 2MB. Vui lòng nén ảnh rồi thử lại.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload<SelfUserView>("/users/me/avatar", form);
      await refreshMe({ bustAvatar: true });
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api.delete<SelfUserView>("/users/me/avatar");
      await refreshMe({ bustAvatar: true });
      toast.success("Đã xóa ảnh đại diện.");
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ảnh đại diện</CardTitle>
        <CardDescription>JPG, PNG hoặc WebP — tối đa 2MB.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-6">
        <UserAvatar
          fullName={fullName}
          avatarUrl={avatarUrl}
          className="size-24 border"
          fallbackClassName="text-2xl"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <Button
            variant="cta"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <ImageUp aria-hidden />
            {busy ? "Đang tải lên…" : "Tải ảnh lên"}
          </Button>
          {avatarUrl ? (
            <Button variant="destructive" disabled={busy} onClick={handleDelete}>
              <Trash2 aria-hidden /> Xóa ảnh
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
