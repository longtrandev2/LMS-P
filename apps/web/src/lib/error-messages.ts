import { ApiError } from "@/lib/api";

/** Bản dịch tiếng Việt cho mã lỗi nghiệp vụ (api-spec §1) + fallback */
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Bạn cần đăng nhập để tiếp tục.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  ENROLLMENT_REQUIRED: "Bạn không thuộc lớp này.",
  ATTEMPT_EXCEEDED: "Bạn đã vượt quá số lượt cho phép.",
  DEADLINE_PASSED: "Đã quá hạn nộp bài.",
  EXAM_NOT_OPEN: "Kỳ thi hiện chưa mở.",
  SESSION_ENDED: "Phiên làm bài đã kết thúc.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu trùng lặp, vui lòng tải lại trang.",
  VALIDATION_ERROR: "Dữ liệu nhập chưa hợp lệ, vui lòng kiểm tra lại.",
  NOT_FOUND: "Không tìm thấy dữ liệu yêu cầu.",
  RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  CONFLICT: "Thao tác xung đột với dữ liệu hiện có. Vui lòng tải lại và thử lại.",
  PROBLEM_CHECK_FAILED: "Lời giải mẫu chưa đúng trên bộ test hiện tại. Sửa đề rồi kiểm tra lại trước khi xuất bản.",
  PROBLEM_UNVERIFIED: "Có câu lập trình chưa được kiểm tra đề bằng lời giải mẫu.",
  INTERNAL: "Hệ thống gặp lỗi không mong muốn. Vui lòng thử lại.",
};

export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    // Server có thể trả message tiếng Việt sẵn — ưu tiên dùng, fallback theo code
    if (error.message && error.message !== "Internal Server Error") return error.message;
    return MESSAGES[error.code] ?? MESSAGES.INTERNAL;
  }
  if (error instanceof Error && error.message === "Failed to fetch") {
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  }
  return MESSAGES.INTERNAL;
}
