import { MonitorPlay, School } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SESSION_MODE_LABEL } from "@/lib/schedule";
import type { ClassSession, SessionMode } from "@/types/api";
import { sessionState, type SessionState } from "./use-schedule";

const STATE: Record<SessionState, { label: string; variant: "success" | "destructive" | "secondary" }> = {
  taken: { label: "Đã điểm danh", variant: "success" },
  unmarked: { label: "Chưa điểm danh", variant: "destructive" },
  upcoming: { label: "Chưa diễn ra", variant: "secondary" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
};

/** Trạng thái điểm danh của buổi: đã điểm danh (xanh) / chưa điểm danh (đỏ nhạt) / chưa diễn ra, đã hủy (xám). */
export function SessionStateBadge({ session }: { session: ClassSession }) {
  const state = STATE[sessionState(session)];
  return <Badge variant={state.variant}>{state.label}</Badge>;
}

/** Hình thức học: trực tiếp (xám) / online (xanh dương nhạt). */
export function SessionModeBadge({ mode }: { mode: SessionMode }) {
  const Icon = mode === "online" ? MonitorPlay : School;
  return (
    <Badge variant={mode === "online" ? "info" : "default"}>
      <Icon aria-hidden /> {SESSION_MODE_LABEL[mode]}
    </Badge>
  );
}
