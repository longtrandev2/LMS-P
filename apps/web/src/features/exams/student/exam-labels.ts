// Nhãn và quy tắc hiển thị cho bài giao theo phiên — docs/exam-spec.md §4, §5, §8.
import { ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";
import { utcDateTimeMillis } from "@/lib/date-time";
import type { AssignmentSummary } from "@/types/api";
import type { PaperMode, SubmitReason } from "@/types/exams";
import { shortDateTime } from "@/features/assignments/student/labels";
import { assignmentCloseAt } from "@/features/assignments/submission-window";

export type ExamWindow = "upcoming" | "open" | "closed";

export const EXAM_WINDOW_LABEL: Record<ExamWindow, string> = { upcoming: "Sắp mở", open: "Đang mở", closed: "Đã đóng" };

export const SUBMIT_REASON_LABEL: Record<SubmitReason, string> = {
  manual: "Tự nộp",
  timeout: "Hết giờ — hệ thống thu",
  forced: "Giảng viên thu",
};

/** Khung giờ bắt đầu được: `[available_from, closes_at)` (§4). */
export function examWindow(item: AssignmentSummary, now = Date.now()): ExamWindow {
  if (item.available_from && now < utcDateTimeMillis(item.available_from)) return "upcoming";
  return now < utcDateTimeMillis(assignmentCloseAt(item)) ? "open" : "closed";
}

export function durationText(minutes: number | null | undefined): string {
  if (minutes == null) return "Không giới hạn thời gian";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

export function paperModeText(mode: PaperMode | undefined, variants: number | null | undefined): string | null {
  if (mode === "variants") return `${variants ?? "Nhiều"} mã đề — mã đề được chia khi bắt đầu`;
  if (mode === "per_student") return "Mỗi sinh viên một đề riêng";
  return null;
}

/** Đồng hồ đếm ngược: `mm:ss`, từ 1 giờ trở lên `h:mm:ss`. */
export function clockText(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(safe % 60)}` : `${pad(minutes)}:${pad(safe % 60)}`;
}

/**
 * Mốc giờ server (UTC, có thể không kèm múi giờ) → ms. Server trả phần giây lẻ tới nano giây
 * (`06:58:36.008290658`) — cắt còn mili giây trước khi parse để mọi trình duyệt đọc được.
 */
export function serverMillis(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return utcDateTimeMillis(value.replace(/(\.\d{3})\d+/, "$1"));
}

/** Giờ:phút:giây theo giờ máy. */
export function timeOfDay(value: string | number): string {
  const date = new Date(typeof value === "number" ? value : serverMillis(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("vi-VN", { hour12: false });
}

/** Lỗi khi bấm "Bắt đầu làm bài" (§5.2) → câu tiếng Việt rõ nghĩa. */
export function startErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return errorText(error);
  switch (error.code) {
    case "NOT_ELIGIBLE":
      return "Bạn không đủ điều kiện dự thi vì nghỉ quá số buổi cho phép. Liên hệ giảng viên nếu có sai sót.";
    case "EXAM_NOT_OPEN": {
      const from = typeof error.details?.available_from === "string" ? error.details.available_from : null;
      const to = typeof error.details?.closes_at === "string" ? error.details.closes_at : null;
      const range = from || to ? ` Thời gian cho phép bắt đầu: ${from ? `từ ${shortDateTime(from)} ` : ""}${to ? `đến trước ${shortDateTime(to)}` : ""}.` : "";
      return `Hiện không thể bắt đầu: bài chưa mở, đã đóng hoặc còn dưới 1 phút trước giờ đóng.${range}`;
    }
    case "ATTEMPT_EXCEEDED":
      return "Bạn đã dùng hết số lượt làm bài.";
    case "VALIDATION_ERROR":
      return "Bạn cần đọc và đồng ý quy chế trước khi bắt đầu.";
    case "CONFLICT":
      return "Bài này không làm theo phiên. Tải lại trang để làm theo cách thông thường.";
    default:
      return errorText(error);
  }
}

export function isSessionEnded(error: unknown): boolean {
  return error instanceof ApiError && error.code === "SESSION_ENDED";
}
