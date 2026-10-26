/** Giới hạn dữ liệu câu hỏi — docs/assessment-spec.md §1–4. */
export const LIMITS = {
  content: 60_000,
  explanation: 10_000,
  options: { min: 2, max: 8 },
  accepted: 20,
  answerText: 200,
  pairText: 500,
  pairs: { min: 2, max: 12 },
  distractors: 6,
  items: { min: 2, max: 12 },
  timeMs: { min: 100, max: 10_000 },
  memoryMb: { min: 32, max: 1024 },
  epsilon: { min: 1e-12, max: 1 },
  starterBytes: 64 * 1024,
  solutionBytes: 128 * 1024,
  tests: { min: 1, max: 100 },
  inputBytes: 128 * 1024,
  expectedBytes: 64 * 1024,
  totalTestBytes: 2 * 1024 * 1024,
} as const;

const encoder = new TextEncoder();
export const byteSize = (text: string) => encoder.encode(text).length;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0).replace(".", ",")} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2).replace(".", ",")} MiB`;
}

export function testsTotalBytes(tests: { input: string; expected_output: string }[]): number {
  return tests.reduce((sum, test) => sum + byteSize(test.input) + byteSize(test.expected_output), 0);
}
