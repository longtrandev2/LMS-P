import { useRealtime } from "@/lib/realtime/use-realtime";

interface TimingChanged { session_id?: number; status?: string; ends_at?: string }

/**
 * `session.timing_changed` cho phiên đang mở (giảng viên gia hạn/thu bài, server tự nộp) — message-contracts §6.1.
 * Payload chỉ là tín hiệu: caller đọc lại phiên qua REST rồi cập nhật đồng hồ hoặc chuyển màn "Đã nộp".
 */
export function useTimingSignal(sessionId: number, onChange: () => void, enabled = true) {
  useRealtime<TimingChanged | null>("session.timing_changed", (data) => {
    if (Number(data?.session_id) === sessionId) onChange();
  }, enabled && Number.isFinite(sessionId));
}
