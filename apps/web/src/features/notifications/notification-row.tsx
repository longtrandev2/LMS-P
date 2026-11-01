import { lazy, Suspense, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "./relative-time";
import { notificationMeta } from "./notification-meta";
import type { NotificationItem } from "./types";

// Chỉ tải bộ render Markdown khi mở một thông báo hệ thống — chuông nằm trong khung chính.
const MarkdownView = lazy(async () => ({ default: (await import("@/components/markdown-view")).MarkdownView }));

/** Xem trước một dòng: bỏ ký hiệu Markdown phổ biến. */
const plain = (text: string) => text.replace(/[`*_>#~]|\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();

/**
 * Một thông báo: icon theo loại · tiêu đề · thời gian · nội dung tóm tắt.
 * Có `href` → bấm để mở trang; thông báo hệ thống → bấm để mở rộng nội dung Markdown tại chỗ.
 */
export function NotificationRow({ notification, href, onOpen }: {
  notification: NotificationItem;
  href: string | null;
  onOpen: (notification: NotificationItem, href: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const unread = !notification.is_read;
  const expandable = notification.type === "system.announcement" && !!notification.body?.trim();
  const { icon: Icon, label } = notificationMeta(notification.type);

  function click() {
    if (expandable) setExpanded((value) => !value);
    onOpen(notification, expandable ? null : href);
  }

  return (
    <li>
      <button
        type="button"
        onClick={click}
        aria-expanded={expandable ? expanded : undefined}
        aria-label={`${label}${unread ? ", chưa đọc" : ""}: ${notification.title}`}
        className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors outline-none hover:bg-secondary focus-visible:bg-secondary"
      >
        <span aria-hidden className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", unread ? "bg-info" : "bg-transparent")} />
        <Icon aria-hidden strokeWidth={1.75} className={cn("mt-0.5 size-4 shrink-0", unread ? "text-foreground" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-3">
            <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-medium" : "text-muted-foreground")}>
              {notification.title}
            </span>
            <time dateTime={notification.created_at} className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatRelativeTime(notification.created_at)}
            </time>
          </span>
          {notification.body && !expanded ? (
            <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{plain(notification.body)}</span>
          ) : null}
          {expandable ? (
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {expanded ? "Thu gọn" : "Xem nội dung"}
              <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </span>
          ) : null}
        </span>
      </button>
      {expandable && expanded ? (
        <div className="mx-2 mb-2 ml-[2.375rem] rounded-md bg-secondary/60 px-3 py-2">
          <Suspense fallback={<p className="text-xs text-muted-foreground">Đang tải nội dung…</p>}>
            <MarkdownView source={notification.body} className="text-[13px] [&_p]:leading-6" />
          </Suspense>
        </div>
      ) : null}
    </li>
  );
}
