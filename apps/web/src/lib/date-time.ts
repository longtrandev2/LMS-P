function parseUtcDateTime(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function utcDateTimeToLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = parseUtcDateTime(value);
  if (Number.isNaN(date.getTime())) return "";
  const part = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

export function localInputToUtcDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19);
}

export function formatUtcDateTime(value: string): string {
  const date = parseUtcDateTime(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export function utcDateTimeMillis(value: string): number {
  return parseUtcDateTime(value).getTime();
}
