import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { usePublicSettings } from "@/lib/use-public-settings";
import { useAuthStore } from "@/stores/auth";

const EXEMPT_PATHS = ["/attempt", "/problems/", "/attempt-sessions/"];
const USER_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
const CHECK_INTERVAL_MS = 10_000;
const STORAGE_KEY = "lmsp_last_activity";

export function useInactivityTimeout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { data: publicSettings } = usePublicSettings();
  const lastActivityRef = useRef<number>(Date.now());

  const timeoutMinutes = publicSettings?.inactivity_timeout_minutes ?? 30;

  useEffect(() => {
    if (!user || timeoutMinutes <= 0) return;

    const onActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      try { localStorage.setItem(STORAGE_KEY, String(now)); } catch { /* bỏ qua */ }
    };

    USER_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const timer = setInterval(() => {
      // Miễn trừ nếu đang ở phòng thi hoặc màn làm quiz/làm bài lập trình
      const isExempt = EXEMPT_PATHS.some((path) => location.pathname.includes(path));
      if (isExempt) {
        lastActivityRef.current = Date.now();
        return;
      }

      let lastActive = lastActivityRef.current;
      try {
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        if (stored > lastActive) lastActive = stored;
      } catch { /* bỏ qua */ }

      const idleMs = Date.now() - lastActive;
      const timeoutMs = timeoutMinutes * 60_000;

      if (idleMs >= timeoutMs) {
        clearInterval(timer);
        if (refreshToken) {
          api.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
        }
        clearSession();
        toast.warning("Phiên đăng nhập đã hết hạn.");
        navigate("/login", { replace: true });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      USER_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      clearInterval(timer);
    };
  }, [user, timeoutMinutes, location.pathname, refreshToken, clearSession, navigate]);
}