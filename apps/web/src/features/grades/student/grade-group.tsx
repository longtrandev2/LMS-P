import { cn } from "@/lib/utils";

export interface GradeLine {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Ghi chú nhỏ dưới giá trị (vd. "Giảng viên điều chỉnh", "Tạm tính"). */
  note?: React.ReactNode;
}

/** Nhóm điểm dạng bảng 2 cột nhãn–giá trị (kiểu S-Link "Chi tiết điểm học phần"). */
export function GradeGroup({ id, title, lines, className }: { id: string; title: string; lines: GradeLine[]; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0", className)}>
      <h3 id={id} className="mb-2 text-sm font-semibold">{title}</h3>
      <dl className="overflow-hidden rounded-xl border text-sm">
        {lines.map((line) => (
          <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_9rem] border-b last:border-b-0">
            <dt className="flex items-center bg-secondary/60 px-4 py-3 text-foreground/80">{line.label}</dt>
            <dd className="flex min-w-0 flex-col items-end justify-center px-4 py-2.5 text-right">
              <span className="font-semibold tabular-nums">{line.value}</span>
              {line.note ? <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{line.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
