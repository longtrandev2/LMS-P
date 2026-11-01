import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackBlocker } from "@/lib/use-back-blocker";

/**
 * Cảnh báo rời trang khi còn thay đổi chưa lưu.
 * Chặn: đóng/tải lại tab (`beforeunload`), click mọi link nội bộ trong trang (bắt ở capture phase)
 * và nút Back/Forward của trình duyệt (`useBlocker`).
 */
export function useLeaveGuard(dirty: boolean) {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const back = useBackBlocker(() => dirtyRef.current);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      const href = `${url.pathname}${url.search}${url.hash}`;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  /** Điều hướng có hỏi xác nhận (dùng cho nút trong trang). */
  const requestLeave = useCallback((href: string) => {
    if (dirtyRef.current) setPendingHref(href); else navigate(href);
  }, [navigate]);
  const confirm = () => {
    const href = pendingHref;
    dirtyRef.current = false;
    setPendingHref(null);
    if (href) navigate(href); else back.proceed();
  };

  return { pendingHref: pendingHref ?? back.blockedHref, requestLeave, confirm, cancel: () => { setPendingHref(null); back.reset(); } };
}
