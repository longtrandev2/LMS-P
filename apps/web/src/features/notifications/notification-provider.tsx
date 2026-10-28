import { type ReactNode } from "react";

/** Dữ liệu thông báo đọc qua REST; tín hiệu `notification.created` xử lý ở `lib/realtime/use-global-signals.ts`. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
