import type { GradeImportRow } from "@/types/api";

export interface ParsedGradeCsv { rows: GradeImportRow[]; errors: { row: number; reason: string }[] }

const HEADER_ALIASES: Record<"student_code" | "midterm" | "final", string[]> = {
  student_code: ["student_code", "ma_sv", "masv", "mã sv", "mã sinh viên", "ma sinh vien"],
  midterm: ["midterm", "giua_ky", "giữa kỳ", "giua ky", "gk", "điểm giữa kỳ"],
  final: ["final", "cuoi_ky", "cuối kỳ", "cuoi ky", "ck", "điểm cuối kỳ"],
};

/** Tách một dòng CSV (hỗ trợ ô trong ngoặc kép, `""` thoát dấu nháy). */
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { cells.push(cell); cell = ""; }
    else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/** Điểm 0–10, tối đa 2 chữ số lẻ; nhận cả dấu phẩy thập phân. Ô trống → null. */
function parseScore(raw: string | undefined): number | null | "invalid" {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (!/^\d{1,2}([.,]\d{1,2})?$/.test(value)) return "invalid";
  const score = Number(value.replace(",", "."));
  return score >= 0 && score <= 10 ? score : "invalid";
}

/**
 * Đọc CSV điểm Giữa kỳ/Cuối kỳ ở trình duyệt (cột `student_code, midterm, final` — api-spec §8):
 * bỏ BOM, tự nhận dấu phân cách `,` hoặc `;`, số dòng tính theo tệp (dòng tiêu đề = 1).
 */
export function parseGradeCsv(text: string): ParsedGradeCsv {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.trim() !== "");
  if (headerIndex < 0) return { rows: [], errors: [{ row: 1, reason: "Tệp trống." }] };
  const headerLine = lines[headerIndex];
  const delimiter = (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const header = splitLine(headerLine, delimiter).map((h) => h.toLowerCase());
  const col = (key: keyof typeof HEADER_ALIASES) => header.findIndex((h) => HEADER_ALIASES[key].includes(h));
  const codeCol = col("student_code"), midCol = col("midterm"), finalCol = col("final");
  if (codeCol < 0 || (midCol < 0 && finalCol < 0)) {
    return { rows: [], errors: [{ row: headerIndex + 1, reason: "Thiếu cột student_code và ít nhất một cột midterm/final." }] };
  }

  const rows: GradeImportRow[] = [];
  const errors: ParsedGradeCsv["errors"] = [];
  lines.slice(headerIndex + 1).forEach((line, i) => {
    if (!line.trim()) return;
    const row = headerIndex + i + 2;
    const cells = splitLine(line, delimiter);
    const code = cells[codeCol] ?? "";
    const midterm = midCol >= 0 ? parseScore(cells[midCol]) : null;
    const final = finalCol >= 0 ? parseScore(cells[finalCol]) : null;
    if (!code) errors.push({ row, reason: "Thiếu mã sinh viên." });
    else if (midterm === "invalid" || final === "invalid") errors.push({ row, reason: "Điểm phải là số 0–10, tối đa 2 chữ số lẻ." });
    else if (midterm == null && final == null) errors.push({ row, reason: "Dòng không có điểm nào." });
    else rows.push({ row, student_code: code, midterm, final });
  });
  if (rows.length + errors.length > 500) return { rows: [], errors: [{ row: 1, reason: "Tối đa 500 dòng mỗi lần nhập." }] };
  return { rows, errors };
}

/** Lưu blob thành tệp tải về. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
