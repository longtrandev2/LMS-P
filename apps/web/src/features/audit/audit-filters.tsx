import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACTION_LABELS, ENTITY_LABELS } from "./audit-labels";

export interface AuditFilterValues { actor: string; action: string; entity: string; from: string; to: string }

const ALL = "__all";
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Thanh công cụ lọc nhật ký: hành động · đối tượng · ID người thao tác · khoảng thời gian (popover). */
export function AuditFilters({ value, onChange, onClear, fetching }: {
  value: AuditFilterValues;
  onChange: (patch: Partial<AuditFilterValues>) => void;
  onClear: () => void;
  fetching: boolean;
}) {
  const filtered = Boolean(value.actor || value.action || value.entity || value.from || value.to);
  const hasRange = Boolean(value.from || value.to);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.action || ALL} onValueChange={(v) => onChange({ action: v === ALL ? "" : v })}>
        <SelectTrigger className="w-full sm:w-60" aria-label="Lọc theo hành động"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={ALL}>Mọi hành động</SelectItem>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{capitalize(label)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.entity || ALL} onValueChange={(v) => onChange({ entity: v === ALL ? "" : v })}>
        <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-44" aria-label="Lọc theo loại đối tượng"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Mọi đối tượng</SelectItem>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        aria-label="ID người thao tác"
        placeholder="ID người thao tác"
        inputMode="numeric"
        className="w-[calc(50%-0.25rem)] sm:w-40"
        value={value.actor}
        onChange={(e) => onChange({ actor: e.target.value.replace(/\D/g, "") })}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={hasRange ? "" : "text-muted-foreground"}>
            <CalendarRange aria-hidden /> {hasRange ? "Đang lọc thời gian" : "Thời gian"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="audit-from">Từ</Label>
            <Input id="audit-from" type="datetime-local" value={value.from} onChange={(e) => onChange({ from: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-to">Đến</Label>
            <Input id="audit-to" type="datetime-local" value={value.to} onChange={(e) => onChange({ to: e.target.value })} />
          </div>
          {hasRange ? (
            <Button variant="link" size="sm" className="text-muted-foreground" onClick={() => onChange({ from: "", to: "" })}>
              Bỏ lọc thời gian
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
      <div className="flex items-center gap-3 sm:ml-auto">
        {fetching ? <span className="text-xs text-muted-foreground" aria-live="polite">Đang tải…</span> : null}
        {filtered ? (
          <button type="button" onClick={onClear} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Xóa bộ lọc
          </button>
        ) : null}
      </div>
    </div>
  );
}
