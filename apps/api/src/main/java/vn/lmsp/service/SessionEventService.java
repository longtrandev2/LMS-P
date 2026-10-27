package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.SessionClock;
import vn.lmsp.dto.AttemptSessionDtos.SessionEventInput;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.model.SessionEvent;
import vn.lmsp.repository.SessionEventRepository;

/**
 * Sự kiện phiên — docs/exam-spec.md §5.5: client gửi `heartbeat` (chỉ cập nhật `last_seen_at`), `focus_lost`
 * (tăng bộ đếm), `focus_back`, `offline`, `online`; server tự ghi started/resumed/submitted/….
 */
@Service
@RequiredArgsConstructor
public class SessionEventService {
    private static final int MAX_TEXT = 200;
    private final SessionAccess access;
    private final SessionEventRepository events;
    private final SessionEventRateLimiter limiter;
    private final AttemptSessionAssembler assembler;

    @Transactional
    public SessionClock client(Long sessionId, Long studentId, SessionEventInput body) {
        if (body == null || body.type() == null || !SessionEventType.CLIENT.contains(body.type()))
            throw SessionAccess.invalid("Loại sự kiện không hợp lệ");
        LocalDateTime now = UtcTime.now();
        AttemptSession session = access.ownSession(sessionId, studentId, true);
        if (!session.isInProgress()) throw SessionAccess.ended();
        limiter.acquire(session.getId());
        session.touch(now);
        if (body.type() != SessionEventType.heartbeat) {
            if (body.type() == SessionEventType.focus_lost) session.focusLost();
            record(session, body.type(), now, sanitize(body.detail()));
        }
        return assembler.clock(session, now, null, session.getFocusLostCount());
    }

    /** Ghi một sự kiện (server hoặc client đã kiểm tra) trong giao dịch của caller. */
    public void record(AttemptSession session, SessionEventType type, LocalDateTime now, Map<String, Object> detail) {
        events.save(new SessionEvent(session, type, now, detail == null || detail.isEmpty() ? null : detail));
    }

    /** Chỉ giữ giá trị vô hướng; chuỗi cắt còn 200 ký tự, khóa tối đa 50 ký tự. */
    static Map<String, Object> sanitize(Map<String, Object> detail) {
        if (detail == null) return null;
        Map<String, Object> result = new LinkedHashMap<>();
        detail.forEach((key, value) -> {
            if (key == null || key.length() > 50) return;
            if (value instanceof String text) result.put(key, text.length() > MAX_TEXT ? text.substring(0, MAX_TEXT) : text);
            else if (value instanceof Number || value instanceof Boolean) result.put(key, value);
        });
        return result;
    }
}
