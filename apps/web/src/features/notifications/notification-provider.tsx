import { type ReactNode } from "react";

/** Notification data is loaded through REST; WebSocket is reserved for grading updates. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
