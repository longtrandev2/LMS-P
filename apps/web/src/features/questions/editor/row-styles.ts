/**
 * Kiểu “thanh lựa chọn” của Frappe dùng chung cho editor đáp án: hàng nền xám bo góc, focus nổi nền trắng + vòng.
 * Textarea bên trong trong suốt để cả thanh trông như một ô.
 */
export const rowBar = "group/row flex items-start gap-3 rounded-lg bg-secondary px-3 transition-[background-color,box-shadow] duration-150 hover:bg-accent focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/50 focus-within:hover:bg-background";

/** Thanh đang là đáp án đúng: tô xanh nhạt (màu chỉ dùng cho trạng thái). */
export const rowBarCorrect = "bg-success/10 hover:bg-success/15";

export const bareTextarea = "min-h-9 resize-none rounded-none border-0 bg-transparent px-0 py-2 shadow-none hover:bg-transparent focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent";
