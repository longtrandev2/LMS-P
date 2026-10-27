import { useCallback, useRef } from "react";

/** UUID v4; `crypto.randomUUID` chỉ có trong secure context (HTTPS/localhost) nên có dự phòng. */
function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Idempotency-Key cố định cho cùng nội dung (api-spec §1): thử lại sau lỗi mạng dùng lại key,
 * nội dung đổi thì sinh key mới. Gọi `reset()` sau khi nộp thành công.
 */
export function useIdempotencyKey() {
  const current = useRef<{ key: string; signature: string } | null>(null);
  const keyFor = useCallback((signature: string) => {
    if (current.current?.signature !== signature) current.current = { key: uuid(), signature };
    return current.current.key;
  }, []);
  const reset = useCallback(() => { current.current = null; }, []);
  return { keyFor, reset };
}
