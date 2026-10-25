export interface EnrollmentCsvTarget {
  row: number;
  student_code?: string;
  email?: string;
}

function recordsFromCsv(text: string): { row: number; cells: string[] }[] {
  const delimiter = (() => {
    const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
    return (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  })();
  const records: { row: number; cells: string[] }[] = [];
  let cells: string[] = [], cell = "", quoted = false, line = 1, recordLine = 1;
  const finishCell = () => { cells.push(cell.trim()); cell = ""; };
  const finishRow = () => { finishCell(); records.push({ row: recordLine, cells }); cells = []; recordLine = line + 1; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else { cell += ch; if (ch === "\n") line++; }
    } else if (ch === '"' && cell.length === 0) quoted = true;
    else if (ch === delimiter) finishCell();
    else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      finishRow(); line++; recordLine = line;
    } else cell += ch;
  }
  if (quoted) throw new Error("File CSV có dấu ngoặc kép chưa đóng.");
  if (cell.length || cells.length) finishRow();
  return records.filter((record) => record.cells.some((value) => value.length > 0));
}

export function parseEnrollmentCsv(text: string): EnrollmentCsvTarget[] {
  const records = recordsFromCsv(text.replace(/^\uFEFF/, ""));
  const header = records.shift();
  if (!header) throw new Error("File CSV đang trống.");
  const names = header.cells.map((value) => value.trim().toLowerCase());
  const codeIndex = names.indexOf("student_code");
  const emailIndex = names.indexOf("email");
  if (codeIndex < 0 && emailIndex < 0) throw new Error("CSV cần có cột student_code hoặc email.");
  return records.map(({ row, cells }) => ({
    row,
    ...(codeIndex >= 0 ? { student_code: cells[codeIndex] || undefined } : {}),
    ...(emailIndex >= 0 ? { email: cells[emailIndex] || undefined } : {}),
  }));
}
