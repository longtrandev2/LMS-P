package vn.lmsp.service;

import java.time.LocalDateTime;
import org.springframework.stereotype.Component;
import vn.lmsp.model.Assignment;

/**
 * Chính sách xem lại câu khách quan — docs/assessment-spec.md §6. Giảng viên luôn được xem đủ;
 * bài code luôn hiện verdict ngay nên không đi qua lớp này.
 */
@Component
public class ReviewPolicy {
    /** Thời điểm sinh viên được xem lại; `null` khi `review_mode=never`. */
    public LocalDateTime availableAt(Assignment assignment, LocalDateTime submittedAt) {
        if (assignment.getReviewMode() == null) return assignment.getClosesAt();
        return switch (assignment.getReviewMode()) {
            case never -> null;
            case after_submit -> submittedAt;
            case after_close -> assignment.getClosesAt();
        };
    }

    public boolean available(Assignment assignment, LocalDateTime submittedAt, LocalDateTime now) {
        LocalDateTime at = availableAt(assignment, submittedAt);
        return at != null && !now.isBefore(at);
    }

    /** Có hiện đáp án đúng + giải thích khi đã được xem lại không. */
    public boolean showsAnswers(Assignment assignment, boolean reviewAvailable) {
        return reviewAvailable && assignment.isReviewShowsAnswers();
    }
}
