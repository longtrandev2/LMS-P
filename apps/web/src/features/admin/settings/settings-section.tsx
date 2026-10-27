import { formatUtcDateTime, utcDateTimeMillis } from "@/lib/date-time";
import type { SettingKey } from "@/types/admin";
import type { SettingsMap } from "./settings-model";

interface SectionProps {
  id: string;
  title: string;
  description: string;
  keys: SettingKey[];
  map: SettingsMap;
  children: React.ReactNode;
}

/** Nhóm cấu hình kiểu trang soạn (DESIGN.md §4): cột trái tiêu đề + mô tả, cột phải các ô; chân nhóm ghi lần sửa cuối. */
export function SettingsSection({ id, title, description, keys, map, children }: SectionProps) {
  const last = keys
    .map((key) => map[key])
    .filter((item) => item?.updated_at)
    .sort((a, b) => utcDateTimeMillis(b?.updated_at ?? "") - utcDateTimeMillis(a?.updated_at ?? ""))[0];

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-20 gap-x-10 gap-y-4 border-t py-8 first:border-t-0 first:pt-2 md:grid-cols-[13rem_1fr]">
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0 space-y-5">
        {children}
        <p className="text-xs text-muted-foreground">
          {last?.updated_at
            ? <>Sửa lần cuối bởi <span className="font-medium text-foreground/80">{last.updated_by?.full_name ?? "hệ thống"}</span> lúc {formatUtcDateTime(last.updated_at)}</>
            : "Chưa sửa lần nào — đang dùng giá trị mặc định."}
        </p>
      </div>
    </section>
  );
}

/** Dòng phụ dưới ô: "Mặc định: …" + gợi ý; lỗi (nếu có) thay chỗ gợi ý, đỏ. */
export function FieldHelp({ id, defaultText, hint, error }: { id: string; defaultText?: string; hint?: string; error?: string }) {
  return (
    <p id={id} className="text-xs text-muted-foreground">
      {error ? <span role="alert" className="text-destructive">{error}</span> : null}
      {error ? null : <>
        {defaultText ? <>Mặc định: {defaultText}</> : null}
        {defaultText && hint ? " · " : null}
        {hint}
      </>}
    </p>
  );
}
