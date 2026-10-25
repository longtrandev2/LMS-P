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

    public Window window(Assignment assignment, LocalDateTime now) {
        if (assignment.getAvailableFrom() != null && now.isBefore(assignment.getAvailableFrom())) throw conflict("Bài chưa mở");
        if (!now.isAfter(assignment.getDueAt())) return new Window(false, 0);
        if (!assignment.isAllowLate() || assignment.getLateDueAt() == null || now.isAfter(assignment.getLateDueAt()))
            throw conflict("Đã hết hạn nộp bài");
        return new Window(true, assignment.getLatePenaltyPercent());
    }

    private LmsException conflict(String message) {
        return new LmsException("CONFLICT", message, HttpStatus.CONFLICT, null);
    }
}
