/** Bảng không khung (pattern Danh sách): cột đầu/cuối sát lề nội dung, thẳng hàng với tiêu đề section. */
export const FLUSH_TABLE =
  "[&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0 [&_tbody_tr:last-child]:border-b";

/** Thanh công cụ danh sách đặt ngoài khung: không viền, không padding ngang. */
export const FLUSH_TOOLBAR = "border-b-0 p-0 sm:px-0";
