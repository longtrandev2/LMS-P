import { EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Cảnh báo sau khi quay lại trang làm bài (exam-spec §5.5) — không chặn thao tác, đóng được. */
export function FocusWarning({ count, onDismiss }: { count: number; onDismiss: () => void }) {
  return <div role="alert" className="flex shrink-0 items-start gap-3 border-b bg-warning/12 px-4 py-2.5 text-sm text-warning sm:px-5">
    <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
    <p className="min-w-0 flex-1 leading-5">
      Bạn vừa rời khỏi trang làm bài (lần thứ <span className="font-semibold tabular-nums">{count}</span>). Hành động này đã được ghi lại.
    </p>
    <Button type="button" variant="ghost" size="icon-xs" className="text-warning hover:bg-warning/15" onClick={onDismiss} aria-label="Đóng cảnh báo">
      <X aria-hidden />
    </Button>
  </div>;
}
