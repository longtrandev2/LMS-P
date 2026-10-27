package vn.lmsp.service;

import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.common.SessionClock;
import vn.lmsp.model.ClassSession;
import vn.lmsp.repository.ClassSessionRepository;

/**
 * Đánh lại `session_no` 1..n theo thời gian cho cả lớp sau mỗi thay đổi lịch.
 * Gọi trong transaction đã khóa dòng lớp; đổi số qua giá trị âm tạm để không vi phạm UNIQUE(class_id, session_no).
 */
@Component
@RequiredArgsConstructor
public class SessionNumbering {
    public static final int MAX_SESSIONS = 200;
    private final ClassSessionRepository sessions;

    public List<ClassSession> renumber(Long classId) {
        List<ClassSession> ordered = sessions.findByLmsClass_IdOrderByStartsAtAscEndsAtAscIdAsc(classId);
        List<Integer> changed = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) if (ordered.get(i).getSessionNo() != i + 1) changed.add(i);
        if (changed.isEmpty()) return ordered;
        changed.forEach(i -> ordered.get(i).assignNumber(-(i + 1)));
        sessions.flush();
        changed.forEach(i -> ordered.get(i).assignNumber(i + 1));
        sessions.flush();
        return ordered;
    }

    /** Số tạm (lớn hơn mọi số hiện có) cho buổi mới trước khi đánh lại. */
    public static int nextTemporaryNumber(List<ClassSession> existing) {
        return existing.stream().mapToInt(ClassSession::getSessionNo).max().orElse(0) + 1;
    }

    public static void validatePeriods(int start, int end) {
        if (start < SessionClock.FIRST_PERIOD || end > SessionClock.LAST_PERIOD || start > end)
            throw ScheduleErrors.invalid("Tiết học phải trong khoảng 1–14 và tiết bắt đầu không lớn hơn tiết kết thúc");
    }

    public static void requireCapacity(int total) {
        if (total > MAX_SESSIONS) throw ScheduleErrors.invalid("Mỗi lớp có tối đa " + MAX_SESSIONS + " buổi học");
    }
}
