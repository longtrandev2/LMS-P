package vn.lmsp.service;

import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.AttemptSession;

/**
 * Nộp một phiên bằng câu trả lời đã lưu và chấm — docs/exam-spec.md §5.6. Dùng chung cho nộp tay, scheduler tự nộp và
 * giảng viên thu bài.
 */
public interface SessionSubmitter {
    /**
     * Claim `in_progress → submitted` bằng câu lệnh có điều kiện; nếu giành được thì tạo lượt, chấm khách quan, đẩy code
     * vào hàng đợi (priority 10 với kỳ thi), ghi sự kiện + audit. Phiên đã nộp trước đó: không làm gì.
     * Chạy trong giao dịch riêng của nó ({@code REQUIRES_NEW} không bắt buộc; caller không được giữ entity cũ sau lời gọi).
     *
     * @param actorId người thực hiện để audit (sinh viên, giảng viên, hoặc null với scheduler)
     * @return phiên sau khi nộp (đọc lại từ DB)
     */
    AttemptSession submit(Long sessionId, SubmitReason reason, Long actorId);
}
