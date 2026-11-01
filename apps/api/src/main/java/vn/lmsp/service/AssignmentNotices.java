package vn.lmsp.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import vn.lmsp.common.SessionClock;
import vn.lmsp.model.Assignment;

/** Nội dung thông báo theo bài (tiêu đề, thân, `data`) — docs/admin-spec.md §8. Giờ hiển thị theo giờ Việt Nam. */
final class AssignmentNotices {
    static final String ASSIGNMENT_PUBLISHED = "assignment.published";
    static final String EXAM_PUBLISHED = "exam.published";
    static final String EXAM_UPCOMING = "exam.upcoming";
    static final String GRADE_RELEASED = "grade.released";
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private AssignmentNotices() { }

    static String publishedType(Assignment item) { return item.isExam() ? EXAM_PUBLISHED : ASSIGNMENT_PUBLISHED; }

    static String publishedTitle(Assignment item) {
        return (item.isExam() ? "Kỳ thi mới: " : "Bài tập mới: ") + item.getTitle();
    }

    static String publishedBody(Assignment item) {
        StringBuilder body = new StringBuilder("Lớp ").append(item.getLmsClass().getName());
        if (item.getAvailableFrom() != null) body.append(" · Mở lúc ").append(format(item.getAvailableFrom()));
        body.append(item.isExam() ? " · Đóng lúc " : " · Hạn nộp ").append(format(item.getDueAt()));
        if (item.getTimeLimitMinutes() != null) body.append(" · ").append(item.getTimeLimitMinutes()).append(" phút");
        return body.toString();
    }

    static String upcomingTitle(Assignment item) { return "Kỳ thi sắp bắt đầu: " + item.getTitle(); }

    static String upcomingBody(Assignment item) {
        String body = "Lớp " + item.getLmsClass().getName() + " · Bắt đầu lúc " + format(item.getAvailableFrom())
                + " · Đóng lúc " + format(item.getDueAt());
        return item.getTimeLimitMinutes() == null ? body : body + " · " + item.getTimeLimitMinutes() + " phút";
    }

    static String releasedTitle(Assignment item) { return "Đã có kết quả: " + item.getTitle(); }

    static String releasedBody(Assignment item) {
        return "Lớp " + item.getLmsClass().getName() + " · Bài đã đóng, bạn có thể xem lại bài làm và kết quả";
    }

    static Map<String, Object> data(Assignment item) {
        return Map.of("assignment_id", item.getId(), "class_id", item.getClassId());
    }

    private static String format(LocalDateTime utc) { return SessionClock.toLocal(utc).format(TIME); }
}
