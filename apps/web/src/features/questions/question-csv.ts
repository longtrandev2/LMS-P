import type { QuestionCsvRow } from "@/types/api";

export const CSV_TYPES = ["mcq", "multiple_choice", "true_false", "short_answer"] as const;
type CsvType = (typeof CSV_TYPES)[number];
const OPTION_COLUMNS = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f", "option_g", "option_h"];
const MAX_ROWS = 500;

/** Nhận dấu phân cách `,` hay `;` theo dòng tiêu đề (bỏ qua phần trong ngoặc kép). */
export function detectDelimiter(source: string): "," | ";" {
  let quoted = false; let commas = 0; let semis = 0;
  for (const char of source) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && char === ",") commas++;
    else if (!quoted && char === ";") semis++;
  }
  return semis > commas ? ";" : ",";
}

function parseTable(source: string, delimiter: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      row.push(cell); rows.push(row); row = []; cell = "";
      if (char === "\r" && source[i + 1] === "\n") i++;
    } else cell += char;
  }
  if (quoted) throw new Error("CSV có dấu ngoặc kép chưa đóng.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Đọc CSV ở trình duyệt: bỏ BOM, tự nhận `,`/`;`, cột `type`, `explanation`, `option_a…option_h`, `correct_option`. */
export function parseQuestionCsv(raw: string): QuestionCsvRow[] {
  const source = raw.replace(/^\uFEFF/, "");
  const table = parseTable(source, detectDelimiter(source));
  if (table.length < 2) throw new Error("CSV cần có dòng tiêu đề và ít nhất một câu hỏi.");
  const headers = table[0].map((value) => value.trim().toLowerCase());
  const at = (name: string) => headers.indexOf(name);
  if (at("content") < 0 || at("correct_option") < 0) throw new Error("Thiếu cột bắt buộc: content và correct_option.");
  const cell = (row: string[], name: string) => (at(name) < 0 ? "" : row[at(name)] ?? "").trim();
  const result = table.slice(1).map((row, index) => ({ row, line: index + 2 }))
    .filter(({ row }) => row.some((value) => value.trim()))
    .map(({ row, line }): QuestionCsvRow => {
      const options = OPTION_COLUMNS.map((name) => cell(row, name));
      while (options.length && !options.at(-1)) options.pop();
      const type = cell(row, "type").toLowerCase();
      return {
        row: line,
        // Loại lạ vẫn gửi lên để server báo lỗi đúng dòng trong bản xem trước.
        type: (type || "mcq") as CsvType,
        content: row[at("content")] ?? "",
        difficulty: cell(row, "difficulty"),
        options,
        correct_option: cell(row, "correct_option"),
        explanation: cell(row, "explanation") || undefined,
      };
    });
  if (!result.length) throw new Error("CSV chưa có câu hỏi nào.");
  if (result.length > MAX_ROWS) throw new Error(`Mỗi lần nhập tối đa ${MAX_ROWS} câu hỏi.`);
  return result;
}

const TEMPLATE_ROWS = [
  ["type", "content", "difficulty", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"],
  ["mcq", "Cổng mặc định của HTTP là?", "easy", "21", "80", "443", "8080", "B", "HTTP dùng cổng 80."],
  ["multiple_choice", "Giao thức nào thuộc tầng giao vận?", "medium", "TCP", "IP", "UDP", "HTTP", "A;C", ""],
  ["true_false", "UDP đảm bảo thứ tự gói tin.", "easy", "Đúng", "Sai", "", "", "B", "UDP không đảm bảo thứ tự."],
  ["short_answer", "Viết tắt của giao thức điều khiển truyền vận?", "medium", "", "", "", "", "TCP|Transmission Control Protocol", ""],
];

/** File mẫu UTF-8 có BOM để Excel đọc đúng tiếng Việt. */
export function csvTemplateBlob(): Blob {
  const escape = (value: string) => /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const text = TEMPLATE_ROWS.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
  return new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
}
