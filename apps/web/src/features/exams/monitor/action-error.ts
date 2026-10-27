import { ApiError } from "@/lib/api";
import { errorText } from "@/lib/error-messages";

/** 409 khi phiên không còn `in_progress` (đã nộp/tự thu giữa hai lần làm mới) — báo rõ thay vì thông điệp chung. */
export function actionErrorText(error: unknown, action: string): string {
  if (error instanceof ApiError && error.status === 409) {
    return `Không thể ${action}: phiên làm bài đã kết thúc. Bảng đã được làm mới.`;
  }
  return errorText(error);
}
