import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser, LoginResponse } from "@/types/api";

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: LoginResponse) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: CurrentUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ access_token, refresh_token, user }) =>
        set({ accessToken: access_token, refreshToken: refresh_token, user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "lms-auth" }
  )
);

export function hasRole(
  user: CurrentUser | null,
  role: CurrentUser["roles"][number]
): boolean {
  return !!user?.roles?.includes(role);
}

/** Trang mặc định theo vai trò mạnh nhất */
export function homePathFor(user: CurrentUser | null): string {
  if (hasRole(user, "admin")) return "/admin/users";
  if (hasRole(user, "lecturer")) return "/courses";
  if (hasRole(user, "student")) return "/me";
  return "/login";
}
