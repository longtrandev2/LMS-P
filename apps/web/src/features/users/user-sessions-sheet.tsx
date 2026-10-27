import { useState } from "react";
import { LogOut, MonitorOff } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-blocks";
import { errorText } from "@/lib/error-messages";
import type { LoginSessionView } from "@/types/admin";
import type { User } from "@/types/api";
import { deviceLabel } from "./user-agent";
import { UserSessionRow } from "./user-session-row";
import { useUserSessions } from "./use-user-sessions";

type Target = { kind: "one"; session: LoginSessionView } | { kind: "all" };

/** Sheet "Phiên đăng nhập" của một user: liệt kê phiên còn hiệu lực, thu hồi một/tất cả — admin-spec §6. */
export function UserSessionsSheet({ user, onOpenChange }: { user: User | null; onOpenChange: (open: boolean) => void }) {
  const { list, revokeOne, revokeAll } = useUserSessions(user?.id ?? null);
  const [target, setTarget] = useState<Target | null>(null);
  const sessions = list.data ?? [];
  const busy = revokeOne.isPending || revokeAll.isPending;

  async function confirm() {
    if (!target) return;
    try {
      if (target.kind === "one") {
        await revokeOne.mutateAsync(target.session.family);
        toast.success("Đã thu hồi phiên đăng nhập.");
      } else {
        await revokeAll.mutateAsync();
        toast.success(`Đã đăng xuất ${user?.full_name ?? "người dùng"} khỏi mọi thiết bị.`);
      }
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setTarget(null);
    }
  }

  return <>
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Phiên đăng nhập</SheetTitle>
          <SheetDescription className="truncate">{user ? `${user.full_name} · ${user.email}` : null}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.isPending ? <ListSkeleton rows={3} />
            : list.isError ? <ErrorState error={list.error} onRetry={() => list.refetch()} />
            : sessions.length === 0 ? <EmptyState compact icon={MonitorOff} title="Không có phiên nào đang hoạt động"
              description="Người dùng chưa đăng nhập hoặc mọi phiên đã hết hạn/bị thu hồi." />
            : <>
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                {sessions.length} phiên còn hiệu lực, dùng gần nhất trước.
              </p>
              <ul className="divide-y">
                {sessions.map((session) => <UserSessionRow key={session.family} session={session} disabled={busy}
                  onRevoke={() => setTarget({ kind: "one", session })} />)}
              </ul>
            </>}
        </div>
        <SheetFooter className="border-t">
          <Button variant="outline" disabled={busy || sessions.length === 0} onClick={() => setTarget({ kind: "all" })}>
            <LogOut aria-hidden /> Đăng xuất mọi nơi
          </Button>
          <p className="text-xs text-muted-foreground">
            Thu hồi chặn làm mới token; access token đang dùng còn hiệu lực đến khi hết hạn (vài phút).
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    <AlertDialog open={!!target} onOpenChange={(open) => !open && !busy && setTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{target?.kind === "all" ? "Đăng xuất khỏi mọi thiết bị?" : "Thu hồi phiên này?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.kind === "one"
              ? `Phiên ${deviceLabel(target.session.user_agent)} (IP ${target.session.ip ?? "không rõ"}) sẽ phải đăng nhập lại.`
              : `Toàn bộ ${sessions.length} phiên của ${user?.full_name ?? "người dùng"} sẽ bị thu hồi và phải đăng nhập lại.`}
            {" "}Thao tác được ghi vào nhật ký kiểm toán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy} onClick={(event) => { event.preventDefault(); void confirm(); }}>
            {busy ? "Đang thu hồi…" : target?.kind === "all" ? "Đăng xuất mọi nơi" : "Thu hồi"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
