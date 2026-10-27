import { Server, User } from "lucide-react";
import { formatUtcDateTime, utcDateTimeMillis } from "@/lib/date-time";
import { describeAction, entityLabel, entityName } from "./audit-labels";
import { AuditChangePopover } from "./audit-change-popover";
import type { AuditLog } from "./types";

const TIME = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const DAY = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Hôm nay";
  if (dayKey(date) === dayKey(yesterday)) return "Hôm qua";
  const text = DAY.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function groupByDay(logs: AuditLog[]) {
  const groups: { key: string; label: string; items: AuditLog[] }[] = [];
  for (const log of logs) {
    const date = new Date(utcDateTimeMillis(log.created_at));
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(log);
    else groups.push({ key, label: dayLabel(date), items: [log] });
  }
  return groups;
}

function Actor({ id }: { id: number | null }) {
  const Icon = id === null ? Server : User;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="truncate font-medium">{id === null ? "Hệ thống" : `Người dùng #${id}`}</span>
    </span>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  const name = entityName(log);
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b px-4 py-2.5 transition-colors hover:bg-secondary/60 md:grid-cols-[4.5rem_11rem_minmax(0,1fr)_minmax(0,15rem)_auto]">
      <time dateTime={log.created_at} title={`${formatUtcDateTime(log.created_at)}${log.ip ? ` · IP ${log.ip}` : ""}`} className="font-mono text-xs text-muted-foreground tabular-nums">
        {TIME.format(new Date(utcDateTimeMillis(log.created_at)))}
      </time>
      <span className="hidden md:block"><Actor id={log.actor_id} /></span>
      <span className="min-w-0 truncate">
        <span className="text-muted-foreground md:hidden">{log.actor_id === null ? "Hệ thống" : `#${log.actor_id}`} · </span>
        {describeAction(log)}
      </span>
      <span className="col-start-2 row-start-2 min-w-0 truncate text-xs text-muted-foreground md:col-start-auto md:row-start-auto md:text-sm">
        <span className="text-foreground/80" title={name ? entityLabel(log.entity_type) : undefined}>{name ?? entityLabel(log.entity_type)}</span>
        {log.entity_id ? <span className="ml-1.5 font-mono text-xs">#{log.entity_id}</span> : null}
      </span>
      <span className="col-start-3 row-span-2 row-start-1 flex min-w-16 justify-end md:col-start-auto md:row-span-1 md:row-start-auto">
        <AuditChangePopover log={log} />
      </span>
    </li>
  );
}

/** Nhật ký dạng activity log: nhóm theo ngày, mỗi hàng giờ mono · người · hành động · đối tượng · chi tiết. */
export function AuditLogList({ logs }: { logs: AuditLog[] }) {
  return (
    <div>
      {groupByDay(logs).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="border-b px-4 pt-5 pb-2 text-xs font-medium text-muted-foreground">{group.label}</h2>
          <ul>{group.items.map((log) => <AuditRow key={log.id} log={log} />)}</ul>
        </section>
      ))}
    </div>
  );
}
