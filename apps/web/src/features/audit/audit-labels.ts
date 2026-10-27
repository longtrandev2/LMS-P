import type { AuditLog } from "./types";

/** Nhãn loại đối tượng (entity_type) — khớp các `audit.record(...)` ở backend. */
export const ENTITY_LABELS: Record<string, string> = {
  user: "Người dùng",
  course: "Học phần",
  class: "Lớp",
  assignment: "Bài tập",
  submission: "Bài nộp",
  material: "Học liệu",
  question: "Câu hỏi",
  question_bank: "Ngân hàng câu hỏi",
  question_category: "Danh mục câu hỏi",
};

/** Hành động dạng chữ thường, đọc như một câu: "Người dùng #1 · xóa bài tập". */
export const ACTION_LABELS: Record<string, string> = {
  "user.create": "tạo tài khoản",
  "user.update": "cập nhật tài khoản",
  "role.assign": "đổi vai trò",
  "user.avatar.update": "đổi ảnh đại diện",
  "user.avatar.delete": "xóa ảnh đại diện",
  "user.sessions.revoke": "buộc đăng xuất mọi phiên",
  "course.create": "tạo học phần",
  "course.update": "cập nhật học phần",
  "course.delete": "xóa học phần",
  "class.create": "tạo lớp",
  "class.update": "cập nhật lớp",
  "class.delete": "xóa lớp",
  "enrollment.add": "thêm sinh viên vào lớp",
  "enrollment.remove": "xóa sinh viên khỏi lớp",
  "assignment.create": "tạo bài tập",
  "assignment.update": "cập nhật bài tập",
  "assignment.delete": "xóa bài tập",
  "assignment.publish": "công bố bài tập",
  "assignment.publish_unverified": "công bố bài chưa kiểm thử đủ",
  "assignment.published_settings.update": "sửa cài đặt bài đã công bố",
  "material.create": "thêm học liệu",
  "material.update": "cập nhật học liệu",
  "material.delete": "xóa học liệu",
  "question_bank.create": "tạo ngân hàng câu hỏi",
  "question_bank.visibility": "đổi phạm vi chia sẻ ngân hàng",
  "question_bank.permission": "cấp quyền ngân hàng",
  "question_bank.permission_revoke": "thu hồi quyền ngân hàng",
  "question_category.create": "tạo danh mục câu hỏi",
  "question_category.rename": "đổi tên danh mục câu hỏi",
  "question_category.delete": "xóa danh mục câu hỏi",
  "question.create": "tạo câu hỏi",
  "question.update": "cập nhật câu hỏi",
  "question.delete": "xóa câu hỏi",
  "question.test_cases.replace": "thay bộ test của câu hỏi",
  "quiz.submit": "nộp bài quiz",
  "submission.create": "nộp bài lập trình",
  "submission.graded": "chấm xong bài nộp",
  "submission.regrade": "yêu cầu chấm lại",
};

const VERBS: Record<string, string> = { create: "tạo", update: "cập nhật", delete: "xóa" };

export function entityLabel(type: string): string {
  return ENTITY_LABELS[type] ?? type;
}

/** Câu mô tả hành động; nhận ra khóa/mở tài khoản trong `user.update`. */
export function describeAction(log: AuditLog): string {
  if (log.action === "user.update") {
    const before = log.old_value?.status;
    const after = log.new_value?.status;
    if (before !== after && after === "locked") return "khóa tài khoản";
    if (before !== after && after === "active") return "mở khóa tài khoản";
    if (log.new_value?.password_reset === true) return "đặt lại mật khẩu";
  }
  const known = ACTION_LABELS[log.action];
  if (known) return known;
  const [entity, verb] = log.action.split(".");
  return verb && VERBS[verb] ? `${VERBS[verb]} ${entityLabel(entity).toLowerCase()}` : log.action;
}

/** Tên dễ nhận của đối tượng lấy từ giá trị ghi kèm (tiêu đề, tên, mã, email). */
export function entityName(log: AuditLog): string | null {
  for (const source of [log.new_value, log.old_value]) {
    if (!source) continue;
    for (const key of ["title", "name", "code", "email"]) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return null;
}
