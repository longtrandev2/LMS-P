package vn.lmsp.service;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.model.AttemptSession;

/**
 * Tín hiệu phiên thi — docs/message-contracts.md §6.1: `exam.session_changed` cho giảng viên phụ trách lớp + admin đang
 * kết nối; `session.timing_changed` cho chủ phiên khi gia hạn/thu bài/tự nộp. `saved` và `focus` gộp tối đa 1 tín
 * hiệu/5 s mỗi phiên (bộ nhớ trong tiến trình). Mọi lỗi ở đây bị nuốt để không làm hỏng nghiệp vụ.
 */
@Slf4j
@Component
public class ExamRealtimeSignals {
    static final String SESSION_CHANGED = "exam.session_changed", TIMING_CHANGED = "session.timing_changed";
    static final long THROTTLE_MS = 5_000;
    private static final int SWEEP_THRESHOLD = 5_000;
    private final RealtimePublisher realtime;
    private final Clock clock;
    private final Map<String, Long> lastSent = new ConcurrentHashMap<>();

    @Autowired
    public ExamRealtimeSignals(RealtimePublisher realtime) { this(realtime, Clock.systemUTC()); }
    ExamRealtimeSignals(RealtimePublisher realtime, Clock clock) { this.realtime = realtime; this.clock = clock; }

    /** Sự kiện phiên vừa được ghi (trong giao dịch của caller) → tín hiệu tương ứng sau commit. */
    public void onEvent(AttemptSession session, SessionEventType type) {
        try {
            String change = change(type);
            if (change == null) return;
            sessionChanged(session, change);
            if (type == SessionEventType.extended || type == SessionEventType.forced_submitted
                    || type == SessionEventType.auto_submitted) timingChanged(session);
        } catch (RuntimeException error) {
            log.warn("Cannot signal session event {}: {}", type, error.toString());
        }
    }

    /** Tự lưu câu trả lời: `saved`, gộp theo phiên. */
    public void saved(AttemptSession session) {
        try {
            sessionChanged(session, "saved");
        } catch (RuntimeException error) {
            log.warn("Cannot signal session save: {}", error.toString());
        }
    }

    private void sessionChanged(AttemptSession session, String change) {
        boolean throttled = "saved".equals(change) || "focus".equals(change);
        if (throttled && !acquire(session.getId() + ":" + change)) return;
        if ("submitted".equals(change)) forget(session.getId());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("assignment_id", session.getAssignmentId());
        data.put("session_id", session.getId());
        data.put("student_id", session.getStudentId());
        data.put("change", change);
        realtime.toUsersAndAdmins(List.of(session.getAssignment().getLecturerId()), SESSION_CHANGED, data);
    }

    private void timingChanged(AttemptSession session) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("session_id", session.getId());
        data.put("status", session.getStatus());
        data.put("ends_at", session.getEndsAt());
        realtime.toUser(session.getStudentId(), TIMING_CHANGED, data);
    }

    boolean acquire(String key) {
        long now = clock.millis();
        if (lastSent.size() > SWEEP_THRESHOLD) lastSent.values().removeIf(at -> now - at >= THROTTLE_MS);
        boolean[] granted = {false};
        lastSent.compute(key, (ignored, at) -> {
            if (at != null && now - at < THROTTLE_MS) return at;
            granted[0] = true;
            return now;
        });
        return granted[0];
    }

    private void forget(Long sessionId) {
        lastSent.remove(sessionId + ":saved");
        lastSent.remove(sessionId + ":focus");
    }

    static String change(SessionEventType type) {
        return switch (type) {
            case started -> "started";
            case resumed -> "resumed";
            case focus_lost, focus_back, offline, online -> "focus";
            case submitted, auto_submitted, forced_submitted -> "submitted";
            case extended -> "extended";
            case heartbeat -> null;
        };
    }
}
