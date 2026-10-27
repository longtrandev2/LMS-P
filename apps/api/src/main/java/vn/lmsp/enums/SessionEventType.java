package vn.lmsp.enums;

import java.util.EnumSet;
import java.util.Set;

/** Sự kiện phiên làm bài — docs/exam-spec.md §5.5. `heartbeat` không được lưu. */
public enum SessionEventType {
    heartbeat, focus_lost, focus_back, offline, online,
    started, resumed, submitted, auto_submitted, forced_submitted, extended;

    /** Các loại client được phép gửi qua `POST /attempt-sessions/{id}/events`. */
    public static final Set<SessionEventType> CLIENT = EnumSet.of(heartbeat, focus_lost, focus_back, offline, online);
}
