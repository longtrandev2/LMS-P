import { useCallback, useState } from "react";
import { readDraft, removeDraft, writeDraft } from "./local-draft";

/** State có nháp localStorage theo `key` (null = không lưu). Đổi key thì nạp lại nháp của key mới. */
export function useLocalDraft<T>(key: string | null, fallback: T) {
  const [state, setState] = useState(() => ({ key, value: readDraft<T>(key) ?? fallback }));
  if (state.key !== key) setState({ key, value: readDraft<T>(key) ?? fallback });

  const setValue = useCallback((value: T) => {
    setState((current) => ({ ...current, value }));
    if (key) writeDraft(key, value);
  }, [key]);

  const clear = useCallback((value: T) => {
    setState((current) => ({ ...current, value }));
    if (key) removeDraft(key);
  }, [key]);

  return { value: state.value, setValue, clear };
}
