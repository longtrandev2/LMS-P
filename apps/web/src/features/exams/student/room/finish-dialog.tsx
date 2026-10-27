import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/error-messages";

function Group({ label, indexes, onJump, tone }: { label: string; indexes: number[]; onJump: (index: number) => void; tone: string }) {
  if (!indexes.length) return null;
  return <div>
    <p className={`text-xs font-medium ${tone}`}>{label} ({indexes.length})</p>
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {indexes.map((index) => <button key={index} type="button" onClick={() => onJump(index)}
        className="rounded-md bg-secondary px-2 py-1 text-xs tabular-nums transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        Câu {index + 1}
      </button>)}
    </div>
  </div>;
}

/** Xác nhận nộp bài trong phòng thi: số câu chưa làm (bấm để quay lại câu), câu đã đánh dấu; lỗi hiện ngay trong hộp thoại. */
export function FinishDialog({ open, onOpenChange, total, unanswered, flagged, onJump, onConfirm, pending, error }: {
  open: boolean; onOpenChange: (open: boolean) => void; total: number; unanswered: number[]; flagged: number[];
  onJump: (index: number) => void; onConfirm: () => void; pending: boolean; error: unknown;
}) {
  return <AlertDialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Nộp bài?</AlertDialogTitle>
        <AlertDialogDescription>
          {unanswered.length
            ? <>Bạn còn <strong className="font-semibold text-foreground tabular-nums">{unanswered.length}/{total}</strong> câu chưa làm — câu bỏ trống tính 0 điểm.</>
            : <>Bạn đã làm đủ <span className="tabular-nums">{total}/{total}</span> câu.</>}
          {" "}Sau khi nộp không thể sửa bài làm.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-3 text-sm">
        <Group label="Chưa làm" indexes={unanswered} onJump={onJump} tone="text-destructive" />
        <Group label="Đã đánh dấu xem lại" indexes={flagged} onJump={onJump} tone="text-warning" />
        {error ? <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorText(error)} Bài làm vẫn được giữ — bạn có thể thử nộp lại.
        </p> : null}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Làm tiếp</AlertDialogCancel>
        <Button variant="cta" onClick={onConfirm} disabled={pending}>{pending ? "Đang nộp…" : error ? "Thử nộp lại" : "Nộp bài"}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
