import type { GradingVerdict } from "@/types/api";

/** Nhãn verdict tiếng Việt — docs/assessment-spec.md §5, §7. */
export const VERDICT_LABEL: Record<GradingVerdict, string> = {
  AC: "Đúng",
  WA: "Sai kết quả",
  CE: "Lỗi biên dịch",
  TLE: "Quá thời gian",
  MLE: "Vượt bộ nhớ",
  RE: "Lỗi khi chạy",
  OLE: "Output quá dài",
  OK: "Chạy xong",
  SYSTEM_ERROR: "Lỗi hệ thống chấm",
};

export type VerdictTone = "success" | "danger" | "warning" | "neutral";

export function verdictTone(verdict: GradingVerdict | null | undefined): VerdictTone {
  if (verdict === "AC" || verdict === "OK") return "success";
  if (verdict === "SYSTEM_ERROR") return "neutral";
  if (verdict === "TLE" || verdict === "MLE" || verdict === "OLE") return "warning";
  return verdict ? "danger" : "neutral";
}
