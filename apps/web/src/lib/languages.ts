import type { ProgrammingLanguage } from "@/types/api";

/** Ngôn ngữ chấm — docs/assessment-spec.md §4. Nhãn hiển thị kèm phiên bản trình biên dịch. */
export const LANGUAGES: { id: ProgrammingLanguage; label: string; short: string; extensions: string[] }[] = [
  { id: "python", label: "Python 3.12", short: "Python", extensions: [".py"] },
  { id: "c", label: "C (gcc, C17)", short: "C", extensions: [".c"] },
  { id: "cpp", label: "C++ (g++, C++20)", short: "C++", extensions: [".cpp", ".cc", ".cxx"] },
  { id: "java", label: "Java 21", short: "Java", extensions: [".java"] },
];

export const ALL_LANGUAGES: ProgrammingLanguage[] = LANGUAGES.map((item) => item.id);

export function languageLabel(id: string | null | undefined): string {
  return LANGUAGES.find((item) => item.id === id)?.label ?? id ?? "";
}

export function languageFromFileName(name: string): ProgrammingLanguage | null {
  const lower = name.toLowerCase();
  return LANGUAGES.find((item) => item.extensions.some((ext) => lower.endsWith(ext)))?.id ?? null;
}

/** Code khởi đầu mặc định: đọc stdin, ghi stdout. Java bắt buộc class `Main`. */
export const DEFAULT_STARTERS: Record<ProgrammingLanguage, string> = {
  python: "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO\n\nmain()\n",
  c: "#include <stdio.h>\n\nint main(void) {\n    // TODO\n    return 0;\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO\n    return 0;\n}\n",
  java: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        // TODO\n    }\n}\n",
};
