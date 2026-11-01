import { useSearchParams } from "react-router-dom";

/** Tab đang chọn lưu ở `?tab=` (DESIGN.md §5 — workspace lớp). Giá trị lạ → tab mặc định. */
export function useTabParam<T extends string>(tabs: readonly T[], fallback: T): [T, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const current = tabs.find((tab) => tab === raw) ?? fallback;
  const setTab = (next: string) => {
    setParams((prev) => {
      const copy = new URLSearchParams(prev);
      if (next === fallback) copy.delete("tab");
      else copy.set("tab", next);
      return copy;
    }, { replace: true });
  };
  return [current, setTab];
}
