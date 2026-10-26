package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import vn.lmsp.common.LmsException;
import vn.lmsp.model.Assignment;

@Component
public class SubmissionPolicy {
    public record Window(boolean late, int penalty) { }

    public String key(String key) {
        if (key == null || !key.matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))
            throw new LmsException("VALIDATION_ERROR", "Idempotency-Key phải là UUID hợp lệ", HttpStatus.BAD_REQUEST, null);
        return key.toLowerCase(Locale.ROOT);
    }

    /** Cửa sổ nộp (kể cả nộp muộn). Chưa mở → 409 CONFLICT; quá hạn → 409 DEADLINE_PASSED. */
    public Window window(Assignment assignment, LocalDateTime now) {
        if (assignment.getAvailableFrom() != null && now.isBefore(assignment.getAvailableFrom()))
            throw new LmsException("CONFLICT", "Bài chưa mở", HttpStatus.CONFLICT, null);
        if (!now.isAfter(assignment.getDueAt())) return new Window(false, 0);
        if (!assignment.isAllowLate() || assignment.getLateDueAt() == null || now.isAfter(assignment.getLateDueAt()))
            throw new LmsException("DEADLINE_PASSED", "Đã hết hạn nộp bài", HttpStatus.CONFLICT, null);
        return new Window(true, assignment.getLatePenaltyPercent());
    }

    /** `max_attempts` NULL = không giới hạn. */
    public void requireAttemptLeft(Assignment assignment, long used, String message) {
        if (assignment.getMaxAttempts() != null && used >= assignment.getMaxAttempts())
            throw new LmsException("ATTEMPT_EXCEEDED", message, HttpStatus.CONFLICT, null);
    }

    public LmsException idempotencyConflict() {
        return new LmsException("IDEMPOTENCY_CONFLICT", "Idempotency-Key đã dùng cho nội dung khác", HttpStatus.CONFLICT, null);
    }
}
