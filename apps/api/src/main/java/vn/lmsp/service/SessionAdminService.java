package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionSummary;
import vn.lmsp.dto.AttemptSessionDtos.ExtendInput;
import vn.lmsp.dto.AttemptSessionDtos.ForceSubmitInput;
import vn.lmsp.dto.AttemptSessionDtos.SessionEventView;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AttemptSession;
import vn.lmsp.model.SessionEvent;
import vn.lmsp.repository.AttemptSessionRepository;
import vn.lmsp.repository.SessionEventRepository;

/**
 * Giảng viên phụ trách/admin can thiệp phiên làm bài — docs/exam-spec.md §5.6, §7: gia hạn, thu bài, xem dòng thời gian
 * sự kiện. Chỉ phiên `in_progress` được gia hạn/thu bài; gia hạn được phép vượt `closes_at`.
 */
@Service
@RequiredArgsConstructor
public class SessionAdminService {
    private final AttemptSessionRepository sessions;
    private final SessionEventRepository events;
    private final AssignmentAccess access;
    private final SessionSubmitter submitter;
    private final AuditService audit;
    private final SessionAdminSummaryAssembler summaries;

    @Transactional
    public AttemptSessionSummary extend(Long sessionId, ExtendInput body, Long actorId, boolean admin) {
        AttemptSession session = sessions.findForUpdate(sessionId).orElseThrow(this::notFound);
        Assignment assignment = access.lecturerAssignment(session.getAssignmentId(), actorId, admin, false);
        if (!session.isInProgress()) throw conflict("Phiên đã nộp, không thể gia hạn");
        LocalDateTime now = UtcTime.now(), before = session.getEndsAt();
        String reason = body.reason().strip();
        session.extend(body.minutes());
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("minutes", body.minutes());
        detail.put("reason", reason);
        detail.put("by", actorId);
        events.save(new SessionEvent(session, SessionEventType.extended, now, detail));
        audit.record(actorId, "session.extend", "attempt_session", sessionId, Map.of("ends_at", before.toString()),
                Map.of("ends_at", session.getEndsAt().toString(), "minutes", body.minutes(), "reason", reason));
        return summaries.summary(session, assignment, now);
    }

    /** Nộp bằng câu trả lời đã lưu qua {@link SessionSubmitter} (`submit_reason = forced`). */
    @Transactional
    public AttemptSessionSummary forceSubmit(Long sessionId, ForceSubmitInput body, Long actorId, boolean admin) {
        AttemptSession session = sessions.findById(sessionId).orElseThrow(this::notFound);
        Assignment assignment = access.lecturerAssignment(session.getAssignmentId(), actorId, admin, false);
        if (!session.isInProgress()) throw conflict("Phiên đã nộp");
        AttemptSession done = submitter.submit(sessionId, SubmitReason.forced, actorId);
        if (done.getSubmitReason() != SubmitReason.forced) throw conflict("Phiên đã được nộp trước khi thu bài");
        audit.record(actorId, "session.force_submit", "attempt_session", sessionId, null,
                Map.of("reason", body.reason().strip()));
        return summaries.summary(done, assignment, UtcTime.now());
    }

    @Transactional(readOnly = true)
    public List<SessionEventView> events(Long sessionId, Long actorId, boolean admin) {
        AttemptSession session = sessions.findById(sessionId).orElseThrow(this::notFound);
        access.lecturerAssignment(session.getAssignmentId(), actorId, admin, false);
        return events.findAllBySession_IdOrderByOccurredAtAscIdAsc(sessionId).stream()
                .map(event -> new SessionEventView(event.getType(), event.getOccurredAt(), event.getDetail())).toList();
    }

    private LmsException notFound() {
        return new LmsException("NOT_FOUND", "Không tìm thấy phiên làm bài", HttpStatus.NOT_FOUND, null);
    }
    private LmsException conflict(String message) {
        return new LmsException("CONFLICT", message, HttpStatus.CONFLICT, null);
    }
}
