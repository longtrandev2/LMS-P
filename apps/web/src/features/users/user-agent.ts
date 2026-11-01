/** Rút gọn User-Agent thành "Trình duyệt · Hệ điều hành" để admin nhận ra thiết bị (admin-spec §6). */

const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
  [/^curl\//i, "curl"],
  [/PostmanRuntime\//, "Postman"],
  [/^node$|node-fetch|undici/i, "Node.js"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows NT/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

const match = (ua: string, table: [RegExp, string][]) => table.find(([pattern]) => pattern.test(ua))?.[1] ?? null;

export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) return "Không rõ";
  const browser = match(ua, BROWSERS);
  const system = match(ua, SYSTEMS);
  if (browser && system) return `${browser} · ${system}`;
  return browser ?? system ?? "Không rõ";
}
