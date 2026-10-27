import { useEffect, useRef } from "react";

/** Đang gõ hoặc thao tác điều khiển dùng phím mũi tên — không chuyển câu. */
function usesArrowKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  // Radio/checkbox: ←/→ dùng để chuyển câu (radio vẫn đổi lựa chọn bằng ↑/↓), tránh vô tình đổi đáp án.
  if (target instanceof HTMLInputElement) return target.type !== "radio" && target.type !== "checkbox";
  if (["TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest('[role="combobox"],[role="listbox"],[role="option"],[role="slider"],[data-arrow-keys]') != null;
}

function dialogOpen(): boolean {
  return document.querySelector('[role="alertdialog"][data-state="open"],[role="dialog"][data-state="open"]') != null;
}

/** Phím ←/→ chuyển câu khi không gõ trong ô nhập và không có hộp thoại mở. */
export function useArrowNavigation(onPrev: () => void, onNext: () => void) {
  const handlers = useRef({ onPrev, onNext });
  useEffect(() => { handlers.current = { onPrev, onNext }; });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (usesArrowKeys(event.target) || dialogOpen()) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") handlers.current.onPrev();
      else handlers.current.onNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

/** Cảnh báo của trình duyệt khi đóng/tải lại tab lúc còn bài chưa nộp. */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active]);
}
