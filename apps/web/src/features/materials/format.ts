/** Dung lượng đọc được: 12,4 MB — trống/0 (link) thì "—" */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 10 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded.toLocaleString("vi-VN")} ${units[unit]}`;
}

export function formatMaterialDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}
