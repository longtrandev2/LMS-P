import { Link } from "react-router-dom";
import { AlarmClock, ChevronLeft, HardDriveDownload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssignmentSummary } from "@/types/api";
import { reviewPolicyShort, shortDateTime } from "../labels";
import { MetaRow } from "../meta-row";

/** Đầu trang làm quiz kiểu Frappe: tiêu đề 24/600 + hàng meta, nút xám quay về; dưới là dải thông tin nền xanh nhạt. */
export function QuizHeader({ item, attemptNo, backTo, late }: { item: AssignmentSummary; attemptNo: number; backTo: string; late: boolean }) {
  const attempts = item.max_attempts == null ? "không giới hạn lượt" : `được làm ${item.max_attempts} lượt`;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{item.title}</h1>
        <MetaRow items={[
          { icon: RotateCcw, text: `Lượt ${attemptNo}${item.max_attempts != null ? `/${item.max_attempts}` : ""}` },
          { icon: AlarmClock, text: `Hạn ${shortDateTime(late && item.late_due_at ? item.late_due_at : item.due_at)}` },
          { icon: HardDriveDownload, text: "Nháp tự lưu trên trình duyệt này" },
        ]} />
      </div>
      <Button asChild variant="secondary">
        <Link to={backTo} title="Bài làm vẫn được giữ dưới dạng nháp"><ChevronLeft aria-hidden />Về trang bài</Link>
      </Button>
    </div>
    <div className="rounded-lg bg-info/8 px-4 py-3 text-sm leading-6 text-info">
      <p>Quiz gồm {item.question_count} câu · {attempts} · {reviewPolicyShort(item)}.</p>
      <p>{item.score_policy === "best" ? "Điểm của bài lấy theo lượt cao nhất." : "Điểm của bài lấy theo lượt nộp cuối."}
        {late ? ` Bạn đang trong hạn nộp muộn — điểm lượt này bị trừ ${item.late_penalty_percent}%.` : ""}</p>
    </div>
  </div>;
}
