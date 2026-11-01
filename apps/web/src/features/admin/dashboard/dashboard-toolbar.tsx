import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorText } from "@/lib/error-messages";
import { exportStatsCsv, type StatsRange } from "./use-admin-dashboard";

/** Chọn khoảng 7/30 ngày + "Xuất CSV" số liệu theo ngày của khoảng đang chọn. */
export function DashboardToolbar({ days, onDaysChange }: { days: StatsRange; onDaysChange: (days: StatsRange) => void }) {
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportStatsCsv(days);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <ToggleGroup
        type="single"
        size="sm"
        aria-label="Khoảng thời gian thống kê"
        value={String(days)}
        onValueChange={(value) => { if (value) onDaysChange(Number(value) as StatsRange); }}
      >
        <ToggleGroupItem value="7">7 ngày</ToggleGroupItem>
        <ToggleGroupItem value="30">30 ngày</ToggleGroupItem>
      </ToggleGroup>
      <Button variant="outline" onClick={onExport} disabled={exporting}>
        {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
        Xuất CSV
      </Button>
    </>
  );
}
