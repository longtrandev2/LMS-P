import { ListOrdered, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { Countdown, SaveStatusText } from "./room-status";
import type { SaveStatus } from "./use-autosave";

/**
 * Thanh trên cố định của phòng thi (exam-spec §8.1): tên bài + mã đề, trạng thái lưu, đồng hồ, nút "Nộp bài".
 * Màn hẹp: thêm nút mở danh sách câu; trạng thái lưu xuống dòng thứ hai.
 */
export function RoomTopBar({ title, paperCode, attemptNo, seconds, status, dirty, onSubmit, submitting, onOpenNav }: {
  title: string; paperCode: string | null; attemptNo: number; seconds: number; status: SaveStatus; dirty: number;
  onSubmit: () => void; submitting: boolean; onOpenNav: () => void;
}) {
  return <header className="shrink-0 border-b bg-background">
    <div className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-5">
      <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={onOpenNav} aria-label="Danh sách câu hỏi">
        <ListOrdered aria-hidden />
      </Button>
      <LogoMark size={24} className="hidden shrink-0 lg:block" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] leading-5 font-semibold" title={title}>{title}</h1>
        <p className="truncate text-xs text-muted-foreground">
          {paperCode ? <>Mã đề <span className="font-mono font-medium text-foreground">{paperCode}</span> · </> : null}Lượt {attemptNo}
        </p>
      </div>
      <SaveStatusText status={status} dirty={dirty} className="hidden max-w-72 md:flex" />
      <Countdown seconds={seconds} />
      <Button type="button" variant="cta" onClick={onSubmit} disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
        {submitting ? "Đang nộp…" : "Nộp bài"}
      </Button>
    </div>
    <SaveStatusText status={status} dirty={dirty} className="border-t px-4 py-1.5 md:hidden" />
  </header>;
}
