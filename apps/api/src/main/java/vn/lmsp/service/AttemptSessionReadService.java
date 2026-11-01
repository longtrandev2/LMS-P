package vn.lmsp.service;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionSummary;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionView;
import vn.lmsp.repository.AttemptSessionRepository;

/** Phiên của tôi — `GET /me/attempt-sessions`, `GET /attempt-sessions/{id}` (docs/api-spec.md §7). */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AttemptSessionReadService {
    private final SessionAccess access;
    private final AttemptSessionRepository sessions;
    private final AttemptSessionAssembler assembler;

    /** Mới nhất trước; `assignmentId` null = mọi bài. */
    public List<AttemptSessionSummary> mine(Long studentId, Long assignmentId) {
        LocalDateTime now = UtcTime.now();
        var items = assignmentId == null ? sessions.findAllByStudent_IdOrderByStartedAtDescIdDesc(studentId)
                : sessions.findAllByAssignment_IdAndStudent_IdOrderByAttemptNoDesc(assignmentId, studentId);
        return items.stream().map(session -> assembler.summary(session, now)).toList();
    }

    public AttemptSessionView get(Long sessionId, Long studentId) {
        return assembler.view(access.ownSession(sessionId, studentId, false), UtcTime.now());
    }
}
