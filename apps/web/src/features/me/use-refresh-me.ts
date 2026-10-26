import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { CurrentUser, SelfUserView } from "@/types/api";

/**
 * Tải lại GET /auth/me và cập nhật auth store — dùng sau khi sửa hồ sơ,
 * upload/xóa avatar, đổi mật khẩu để UI đồng bộ ngay.
 */
export function useRefreshMe() {
  const setUser = useAuthStore((s) => s.setUser);

  return useCallback(
    async (opts?: { bustAvatar?: boolean }) => {
      const me = await api.get<SelfUserView>("/auth/me");
      const user: CurrentUser = {
        id: me.id,
        email: me.email,
        full_name: me.full_name,
        student_code: me.student_code,
        roles: me.roles,
        status: me.status,
        phone: me.phone,
        // Thêm nonce để UserAvatar fetch lại blob sau khi thay ảnh (URL không đổi)
        avatar_url: me.avatar_url
          ? opts?.bustAvatar
            ? `${me.avatar_url}?v=${Date.now()}`
            : me.avatar_url
          : null,
      };
      setUser(user);
      return user;
    },
    [setUser]
  );
}
