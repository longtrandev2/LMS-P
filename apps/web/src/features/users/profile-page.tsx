import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/state-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { CurrentUser } from "@/types/api";
import { ProfileIdentity } from "@/features/users/profile-identity";
import { ProfileInfoSection, ProfilePasswordSection } from "@/features/users/profile-sections";

const TITLE = "Hồ sơ của tôi";
const DESCRIPTION = "Thông tin cá nhân, ảnh đại diện và mật khẩu đăng nhập.";

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-3"><Skeleton className="size-20 rounded-full" /><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-40" /></div>
      <div className="space-y-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-72" />
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div></div>
    </div>
  );
}

/** Trang hồ sơ kiểu settings của Frappe: cột trái danh tính, vùng phải các section ngăn bằng `border-t`. */
export function ProfilePage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: () => api.get<CurrentUser>("/auth/me") });
  const user = profile.data;
  const onUpdated = (result: CurrentUser) => { queryClient.setQueryData(["me", "profile"], result); setUser(result); };

  return (
    <div className="space-y-8">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      {profile.isPending ? (
        <ProfileSkeleton />
      ) : !user ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <div className="grid gap-10 border-t pt-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <ProfileIdentity user={user} onUpdated={onUpdated} />
          <div className="max-w-2xl space-y-8">
            <ProfileInfoSection key={`info-${user.id}`} user={user} onSaved={onUpdated} />
            <ProfilePasswordSection user={user} onSaved={onUpdated} />
          </div>
        </div>
      )}
    </div>
  );
}
