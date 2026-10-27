import { LogOut, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUtcDateTime, utcDateTimeMillis } from "@/lib/date-time";
import { formatRelativeTime } from "@/features/notifications/relative-time";
import type { LoginSessionView } from "@/types/admin";
import { deviceLabel } from "./user-agent";

const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i;

const SHORT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" };
const shortTime = (iso: string) => new Date(utcDateTimeMillis(iso)).toLocaleString("vi-VN", SHORT);

function Field({ label, value, title }: { label: string; value: string; title?: string }) {
  return <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="truncate tabular-nums" title={title}>{value}</dd>
  </>;
}

/** Một phiên đăng nhập: thiết bị, IP, các mốc thời gian, nút thu hồi. */
export function UserSessionRow({ session, onRevoke, disabled }: {
  session: LoginSessionView; onRevoke: () => void; disabled: boolean;
}) {
  const device = deviceLabel(session.user_agent);
  const Icon = MOBILE.test(session.user_agent ?? "") ? Smartphone : Monitor;
  const lastUsed = session.last_used_at ?? session.created_at;
  return <li className="space-y-3 px-4 py-3.5">
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={session.user_agent ?? undefined}>{device}</p>
        <p className="font-mono text-xs text-muted-foreground">{session.ip ? `IP ${session.ip}` : "IP không rõ"}</p>
      </div>
      <Button type="button" variant="ghost" size="sm" className="-mr-2 text-muted-foreground" onClick={onRevoke} disabled={disabled}
        aria-label={`Thu hồi phiên ${device}, đăng nhập lúc ${formatUtcDateTime(session.created_at)}`}>
        <LogOut aria-hidden /> Thu hồi
      </Button>
    </div>
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pl-7 text-[13px]">
      <Field label="Đăng nhập lúc" value={shortTime(session.created_at)} />
      <Field label="Dùng gần nhất" value={`${formatRelativeTime(lastUsed)} · ${shortTime(lastUsed)}`} />
      <Field label="Hết hạn" value={shortTime(session.expires_at)} />
    </dl>
  </li>;
}
