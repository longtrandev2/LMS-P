import { MarkdownView } from "@/components/markdown-view";
import type { AssignmentDetails } from "@/types/api";
import { examWindow } from "../exam-labels";
import { useMySessions } from "../use-exam-sessions";
import { ExamInfoHeader } from "./exam-info-header";
import { ExamStartPanel } from "./exam-start-panel";
import { SessionHistory } from "./session-history";

const ROOM_NOTES = [
  "Bài làm tự lưu lên máy chủ vài giây một lần và được giữ trên trình duyệt khi mất mạng.",
  "Rời khỏi trang làm bài (đổi tab, thu nhỏ cửa sổ) được ghi lại để giảng viên xem.",
  "Hết giờ hệ thống tự thu bài bằng các câu đã lưu.",
];

/**
 * Trang thông tin bài giao theo phiên (exam-spec §8): đầu trang + mô tả + quy chế ở cột trái, panel bắt đầu bên phải,
 * lịch sử lượt bên dưới. Trên màn hẹp thứ tự là quy chế → panel → lịch sử (đọc quy chế trước khi đồng ý).
 */
export function SessionAssignmentOverview({ details }: { details: AssignmentDetails }) {
  const item = details.assignment;
  const sessions = useMySessions(item.id);
  const window = examWindow(item);
  const rules = item.rules_text?.trim();

  return <div className="space-y-8">
    <ExamInfoHeader item={item} window={window} />
    <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-8">
        {item.description?.trim() ? <MarkdownView source={item.description} className="max-w-prose text-[15px] leading-7" /> : null}
        <section aria-labelledby="exam-rules-title" className="max-w-prose space-y-3">
          <h2 id="exam-rules-title" className="border-b pb-3 text-base font-semibold">Quy chế làm bài</h2>
          {rules ? <MarkdownView source={rules} className="text-[15px] leading-7" />
            : <p className="text-sm text-muted-foreground">Giảng viên không đặt quy chế riêng cho bài này.</p>}
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
            {ROOM_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      </div>
      <aside className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <ExamStartPanel item={item} window={window} sessions={sessions.data ?? []} loading={sessions.isPending} />
      </aside>
      <div className="min-w-0 lg:col-start-1">
        <SessionHistory item={item} sessions={sessions.data ?? []} isPending={sessions.isPending}
          error={sessions.error} onRetry={() => void sessions.refetch()} />
      </div>
    </div>
  </div>;
}
