import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackBlocker } from "@/lib/use-back-blocker";

/**
 * Cảnh báo rời trang khi còn thay đổi chưa lưu:
 * - đóng tab/tải lại: `beforeunload`;
 * - bấm liên kết nội bộ (sidebar, breadcrumb…): chặn ở pha capture rồi hỏi bằng AlertDialog;
 * - nút Back/Forward của trình duyệt: `useBlocker` (data router).
 */
export function useUnsavedGuard(dirty: boolean) {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const back = useBackBlocker(() => dirtyRef.current);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const href = `${url.pathname}${url.search}${url.hash}`;
      if (url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return {
    pendingHref: pendingHref ?? back.blockedHref,
    /** Điều hướng có hỏi lại nếu còn thay đổi chưa lưu. */
    requestLeave: (href: string) => { if (dirtyRef.current) setPendingHref(href); else navigate(href); },
    confirmLeave: () => {
      const href = pendingHref; dirtyRef.current = false; setPendingHref(null);
      if (href) navigate(href); else back.proceed();
    },
    cancelLeave: () => { setPendingHref(null); back.reset(); },
  };
}
