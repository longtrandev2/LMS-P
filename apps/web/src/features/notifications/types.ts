/** Khớp bảng notifications (database-design §2.9) + api-spec §9 */

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

/** Số thông báo lấy về ở trang đầu — đủ cho dropdown, còn lại xem qua REST sau */
export const NOTIFICATION_PAGE_LIMIT = 30;
