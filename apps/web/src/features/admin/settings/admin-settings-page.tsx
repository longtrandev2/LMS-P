import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/state-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { CodeSection, UploadSection, SecuritySection } from "./code-upload-sections";
import { GradePolicySection } from "./grade-policy-section";
import { MaintenanceSection } from "./maintenance-section";
import { SaveSettingsBar } from "./save-settings-bar";
import { useSettingsForm } from "./use-settings-form";

function SettingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="space-y-10">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-10 md:grid-cols-[13rem_1fr]">
          <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div>
          <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-14 w-44" />)}</div>
        </div>
      ))}
    </div>
  );
}

/** Cấu hình hệ thống — docs/admin-spec.md §1, §9. Lưu theo lô: chỉ gửi khóa đã đổi, sai một khóa thì không ghi khóa nào. */
export function AdminSettingsPage() {
  const { status } = useAuthGuard(["admin"]);
  const form = useSettingsForm(status === "ok");
  const { hash } = useLocation();
  const draft = form.draft;
  const errorKeys = Object.keys(form.clientErrors);
  const ready = draft !== null;

  // Link "Tắt bảo trì" trên banner trỏ tới #maintenance — cuộn tới khi form đã hiện.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [hash, ready]);

  if (status !== "ok") return null;

  function focusFirstError() {
    toast.error("Có giá trị chưa hợp lệ, hãy sửa trước khi lưu.");
    document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cấu hình" description="Giới hạn chấm code, dung lượng upload, sổ điểm mặc định và chế độ bảo trì. Thay đổi được ghi nhật ký kiểm toán." />
      {form.query.isPending || (!draft && !form.query.isError) ? <SettingsSkeleton />
        : form.query.isError ? <ErrorState error={form.query.error} onRetry={() => form.query.refetch()} />
        : draft ? (
          <>
            <div>
              <CodeSection form={form} draft={draft} />
              <UploadSection form={form} draft={draft} />
              <SecuritySection form={form} draft={draft} />
              <GradePolicySection form={form} draft={draft} />
              <MaintenanceSection form={form} draft={draft} />
            </div>
            <SaveSettingsBar form={form} hasErrors={errorKeys.length > 0} onInvalid={focusFirstError} />
          </>
        ) : null}
    </div>
  );
}
