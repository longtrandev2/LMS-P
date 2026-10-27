import { ApiError } from "@/lib/api";
import type { AssignmentDetails } from "@/types/api";

/**
 * Lỗi xuất bản do cấu trúc đề (400 VALIDATION_ERROR, exam-spec.md §3.4): kho thiếu, tổng điểm các mã lệch,
 * quá số câu ghim. `ruleIndex` là vị trí quy tắc theo thứ tự gửi lên (theo phần), null khi không xác định được.
 */
export interface PublishIssue {
  message: string;
  shortages: { ruleIndex: number | null; requested: number; available: number }[];
  variantTotals: Record<string, number> | null;
  pinnedCount: number | null;
}

interface ShortageDetail { rule_id?: number; requested?: number; available?: number }

export function hasBlueprintDetails(error: unknown): error is ApiError {
  const details = error instanceof ApiError && error.code === "VALIDATION_ERROR" ? error.details : undefined;
  return !!details && ("shortages" in details || "variant_totals" in details || "pinned_count" in details);
}

/** `rule_id` → vị trí trong `draw_rules` của bản vừa lưu (server trả theo cùng thứ tự đã gửi). */
export function toPublishIssue(error: ApiError, saved: AssignmentDetails | null): PublishIssue {
  const details = error.details ?? {};
  const ids = (saved?.draw_rules ?? []).map((rule) => rule.id);
  const shortages = Array.isArray(details.shortages) ? (details.shortages as ShortageDetail[]) : [];
  const totals = details.variant_totals && typeof details.variant_totals === "object" ? details.variant_totals as Record<string, number> : null;
  return {
    message: error.message,
    shortages: shortages.map((item) => {
      const index = item.rule_id != null ? ids.indexOf(item.rule_id) : -1;
      return { ruleIndex: index >= 0 ? index : null, requested: item.requested ?? 0, available: item.available ?? 0 };
    }),
    variantTotals: totals,
    pinnedCount: typeof details.pinned_count === "number" ? details.pinned_count : null,
  };
}
