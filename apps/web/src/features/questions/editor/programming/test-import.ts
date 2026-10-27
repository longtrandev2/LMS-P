import { byteSize, LIMITS } from "../limits";

export interface ImportedPair { name: string; input: string; expected_output: string; error?: string }
export interface ImportResult { pairs: ImportedPair[]; problems: string[] }
interface Entry { path: string; text: string }

const MAX_FILES = 400;
const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_TEXT_BYTES = 16 * 1024 * 1024;
const normalize = (text: string) => text.replace(/^﻿/, "").replace(/\r\n/g, "\n");

type Role = "input" | "output";
const INPUT_WORD = /^(input|inputs|in)$/i;
const OUTPUT_WORD = /^(output|outputs|out|ans|answer|answers|expected)$/i;

/** Nhận vai trò (input/output) và khóa ghép của một file theo tên: `1.in`/`1.out`/`1.ans`, `1.in.txt`, `input01.txt`/`output01.txt`, `input/1.txt`/`output/1.txt`. */
export function classify(path: string): { role: Role; key: string } | null {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  let base = parts.pop() ?? "";
  const lower = base.toLowerCase();
  let role: Role | null = null;
  const strip = (ext: string) => { base = base.slice(0, base.length - ext.length); };
  if (lower.endsWith(".txt")) strip(".txt");
  const inner = base.toLowerCase().match(/\.(in|out|ans)$/);
  if (inner) { role = inner[1] === "in" ? "input" : "output"; strip(inner[0]); }
  else if (lower.endsWith(".txt")) {
    const prefix = base.match(/^(input|output|answer|expected|ans|out|in)[-_ .]?(?=\d)/i);
    if (prefix) { role = /^in/i.test(prefix[1]) ? "input" : "output"; base = base.slice(prefix[0].length); }
    else {
      const dir = parts.at(-1) ?? "";
      if (INPUT_WORD.test(dir)) role = "input"; else if (OUTPUT_WORD.test(dir)) role = "output";
    }
  }
  if (!role || !base) return null;
  const dirs = parts.filter((part) => !INPUT_WORD.test(part) && !OUTPUT_WORD.test(part));
  return { role, key: [...dirs, base].join("/") };
}

function pairEntries(entries: Entry[]): ImportResult {
  const problems: string[] = [];
  const groups = new Map<string, { input?: string; output?: string }>();
  let skipped = 0;
  for (const entry of entries) {
    const info = classify(entry.path);
    if (!info) { skipped++; continue; }
    const group = groups.get(info.key) ?? {};
    if (group[info.role] != null) problems.push(`Trùng file ${info.role === "input" ? "input" : "output"} cho “${info.key}”.`);
    group[info.role] = normalize(entry.text);
    groups.set(info.key, group);
  }
  if (skipped) problems.push(`Bỏ qua ${skipped} file không nhận dạng được (cần đuôi .in, .out, .ans hoặc .txt).`);
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  const pairs = keys.map((name): ImportedPair => {
    const group = groups.get(name)!;
    const pair = { name, input: group.input ?? "", expected_output: group.output ?? "" };
    if (group.input == null) return { ...pair, error: "Thiếu file input" };
    if (group.output == null) return { ...pair, error: "Thiếu file output" };
    if (byteSize(pair.input) > LIMITS.inputBytes) return { ...pair, error: "Input vượt 128 KiB" };
    if (byteSize(pair.expected_output) > LIMITS.expectedBytes) return { ...pair, error: "Output vượt 64 KiB" };
    return pair;
  });
  if (!pairs.length) problems.push("Không tìm thấy cặp test nào.");
  return { pairs, problems };
}

export async function importFromFiles(files: File[]): Promise<ImportResult> {
  if (files.length > MAX_FILES) throw new Error(`Chọn tối đa ${MAX_FILES} file mỗi lần.`);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TEXT_BYTES) throw new Error("Tổng dung lượng file quá lớn.");
  const entries = await Promise.all(files.map(async (file) => ({ path: file.name, text: await file.text() })));
  return pairEntries(entries);
}

/** Giải nén zip ngay trên trình duyệt (jszip, nạp động); hỗ trợ thư mục con, bỏ qua __MACOSX và file ẩn. */
export async function importFromZip(file: File): Promise<ImportResult> {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error("File zip vượt 20 MB.");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);
  const files = Object.values(zip.files).filter((item) => !item.dir && !/(^|\/)(__MACOSX|\.)/.test(item.name));
  if (files.length > MAX_FILES) throw new Error(`File zip có quá ${MAX_FILES} file.`);
  const entries: Entry[] = [];
  let total = 0;
  for (const item of files) {
    const text = await item.async("string");
    total += text.length;
    if (total > MAX_TEXT_BYTES) throw new Error("Nội dung giải nén quá lớn.");
    entries.push({ path: item.name, text });
  }
  return pairEntries(entries);
}
