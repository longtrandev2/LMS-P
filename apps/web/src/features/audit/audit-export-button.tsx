import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorText } from "@/lib/error-messages";

type Filters = Record<string, string | number | undefined>;

/** "Xuất CSV" theo bộ lọc đang chọn — `GET /admin/audit-logs/export` (admin-spec §7, tối đa 50 000 dòng). */
export function AuditExportButton({ filters }: { filters: Filters }) {
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const { blob, filename } = await api.download("/admin/audit-logs/export", filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename ?? "nhat-ky-kiem-toan.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất nhật ký kiểm toán.");
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  return <Button variant="outline" onClick={() => void exportCsv()} disabled={busy}>
    {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
    {busy ? "Đang xuất…" : "Xuất CSV"}
  </Button>;
}
