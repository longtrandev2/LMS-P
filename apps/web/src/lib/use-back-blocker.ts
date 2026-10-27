import { useBlocker } from "react-router-dom";

/**
 * Chặn nút Back/Forward của trình duyệt khi còn thay đổi chưa lưu (cần data router — `main.tsx`).
 * Link nội bộ do các guard tự chặn ở pha click; hook này chỉ bắt điều hướng kiểu POP sang trang khác.
 */
export function useBackBlocker(isDirty: () => boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) =>
    historyAction === "POP" && isDirty() && nextLocation.pathname !== currentLocation.pathname);
  const blocked = blocker.state === "blocked";
  return {
    blockedHref: blocked && blocker.location ? `${blocker.location.pathname}${blocker.location.search}` : null,
    proceed: () => { if (blocker.state === "blocked") blocker.proceed(); },
    reset: () => { if (blocker.state === "blocked") blocker.reset(); },
  };
}
