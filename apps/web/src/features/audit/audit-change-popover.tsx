import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AuditLog } from "./types";

type Values = Record<string, unknown> | null;

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function rowsOf(before: Values, after: Values) {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort();
  return keys.map((key) => {
    const oldText = show(before?.[key]);
    const newText = show(after?.[key]);
    return { key, oldText, newText, changed: oldText !== newText };
  });
}

/** Chi tiết thay đổi của một dòng nhật ký: bảng trường · trước · sau, trường đổi in đậm. */
export function AuditChangePopover({ log }: { log: AuditLog }) {
  if (!log.old_value && !log.new_value) return null;
  const both = !!log.old_value && !!log.new_value;
  const rows = rowsOf(log.old_value, log.new_value);
  const single = log.new_value ? "Giá trị ghi nhận" : "Giá trị trước khi xóa";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs" className="text-muted-foreground">Chi tiết</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(30rem,calc(100vw-2rem))] p-0">
        <div className="flex items-baseline justify-between gap-3 border-b px-3 py-2">
          <p className="text-sm font-semibold">{both ? "Thay đổi" : single}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{log.action}{log.ip ? ` · ${log.ip}` : ""}</p>
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full table-fixed text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="w-44 px-3 py-1.5 font-medium">Trường</th>
                {both ? <th className="px-3 py-1.5 font-medium">Trước</th> : null}
                <th className="px-3 py-1.5 font-medium">{both ? "Sau" : "Giá trị"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={cn("border-t align-top", both && !row.changed && "text-muted-foreground")}>
                  <td className="truncate px-3 py-1.5 font-mono text-muted-foreground" title={row.key}>{row.key}</td>
                  {both ? <td className="px-3 py-1.5 break-words">{row.oldText}</td> : null}
                  <td className={cn("px-3 py-1.5 break-words", both && row.changed && "font-medium text-foreground")}>
                    {both ? row.newText : log.new_value ? row.newText : row.oldText}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PopoverContent>
    </Popover>
  );
}
