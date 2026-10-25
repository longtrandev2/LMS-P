import type { QuestionCsvRow } from "@/types/api";

const optionNames = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"];

export function parseQuestionCsv(source: string): QuestionCsvRow[] {
  const table = parseTable(source.replace(/^\uFEFF/, ""));
  if (table.length < 2) throw new Error("CSV cần có tiêu đề và ít nhất một câu hỏi.");
  const headers = table[0].map((value) => value.trim().toLowerCase());
  const contentAt = headers.indexOf("content");
  const correctAt = headers.indexOf("correct_option");
  const optionAt = optionNames.map((name) => headers.indexOf(name));
  if (contentAt < 0 || correctAt < 0 || optionAt.slice(0, 2).some((index) => index < 0)) {
    throw new Error("Cần các cột content, option_a, option_b và correct_option.");
  }
  const result = table.slice(1).map((row, index) => ({ row, index })).filter(({ row }) => row.some((value) => value.trim())).map(({ row, index }) => {
    const options = optionAt.map((column) => column < 0 ? "" : row[column] ?? "");
    while (options.length && !options.at(-1)?.trim()) options.pop();
    return {
      row: index + 2,
      content: row[contentAt] ?? "",
      difficulty: valueAt(row, headers, "difficulty"),
      topic: valueAt(row, headers, "topic"),
      options,
      correct_option: row[correctAt] ?? "",
    };
  });
  if (!result.length) throw new Error("CSV chưa có câu hỏi nào.");
  if (result.length > 500) throw new Error("Mỗi lần chỉ nhập tối đa 500 câu hỏi.");
  return result;
}

function valueAt(row: string[], headers: string[], key: string): string {
  const index = headers.indexOf(key);
  return index < 0 ? "" : row[index] ?? "";
}

function parseTable(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      row.push(cell); rows.push(row); row = []; cell = "";
      if (char === "\r" && source[i + 1] === "\n") i++;
    } else cell += char;
  }
  if (quoted) throw new Error("CSV có dấu ngoặc kép chưa đóng.");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
