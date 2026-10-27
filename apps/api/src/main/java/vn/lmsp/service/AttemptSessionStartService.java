package vn.lmsp.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionView;
import vn.lmsp.dto.AttemptSessionDtos.StartSessionInput;
import vn.lmsp.enums.AssignmentCategory;
import vn.lmsp.enums.AttemptSessionStatus;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.model.*;
import vn.lmsp.repository.AttemptSessionRepository;
import vn.lmsp.repository.UserRepository;

/**
 * Bắt đầu hoặc tiếp tục phiên — docs/exam-spec.md §5.2. Khóa dòng bài để hai request đồng thời không tạo hai phiên;
 * UNIQUE (assignment, student, attempt_no) chặn nốt, khi đó trả phiên đang làm.
 */
@Service
public class AttemptSessionStartService {
    /** `created` = phiên mới (201); false = tiếp tục phiên đang làm (200). */
    public record Started(AttemptSessionView view, boolean created) { }

    private final TransactionTemplate tx;
    private final SessionAccess access;
    private final AttemptSessionRepository sessions;
    private final UserRepository users;
    private final PaperProvider papers;
    private final ExamEligibilityService eligibility;
    private final SessionEventService events;
    private final AuditService audit;
    private final AttemptSessionAssembler assembler;
    private final MaintenanceGuard maintenance;

    public AttemptSessionStartService(PlatformTransactionManager transactions, SessionAccess access,
            AttemptSessionRepository sessions, UserRepository users, PaperProvider papers,
            ExamEligibilityService eligibility, SessionEventService events, AuditService audit,
            AttemptSessionAssembler assembler, MaintenanceGuard maintenance) {
        this.tx = new TransactionTemplate(transactions);
        this.access = access; this.sessions = sessions; this.users = users; this.papers = papers;
        this.eligibility = eligibility; this.events = events; this.audit = audit; this.assembler = assembler;
        this.maintenance = maintenance;
    }

    public Started start(Long assignmentId, Long studentId, StartSessionInput body) {
        try {
            return tx.execute(status -> startLocked(assignmentId, studentId, body));
        } catch (DataIntegrityViolationException race) {
            return tx.execute(status -> sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(assignmentId, studentId,
                    AttemptSessionStatus.in_progress).map(this::resume).orElseThrow(() -> race));
        }
    }

    Started startLocked(Long assignmentId, Long studentId, StartSessionInput body) {
        Assignment assignment = access.lockedStudentAssignment(assignmentId, studentId);
        if (!assignment.isSessionBased())
            throw new LmsException("CONFLICT", "Bài này không làm theo phiên", HttpStatus.CONFLICT, null);
        var existing = sessions.findFirstByAssignment_IdAndStudent_IdAndStatus(assignmentId, studentId,
                AttemptSessionStatus.in_progress);
        if (existing.isPresent()) return resume(existing.get());
        maintenance.check(false); // bảo trì chỉ chặn phiên mới, phiên đang làm vẫn tiếp tục — admin-spec §5.2
        LocalDateTime now = now();
        requireOpen(assignment, now);
        long used = sessions.countByAssignment_IdAndStudent_Id(assignmentId, studentId);
        Integer max = assignment.isExam() ? Integer.valueOf(1) : assignment.getMaxAttempts();
        if (max != null && used >= max)
            throw new LmsException("ATTEMPT_EXCEEDED", "Bạn đã dùng hết số lượt làm bài", HttpStatus.CONFLICT, null);
        if (assignment.getCategory() == AssignmentCategory.FINAL) eligibility.requireEligible(assignment, studentId);
        boolean accepted = body != null && Boolean.TRUE.equals(body.accept_rules());
        if (assignment.getRulesText() != null && !assignment.getRulesText().isBlank() && !accepted)
            throw SessionAccess.invalid("Bạn cần xác nhận đã đọc quy chế trước khi bắt đầu");
        int attemptNo = (int) used + 1;
        User student = users.findById(studentId).orElseThrow(() -> SessionAccess.notFound("Không tìm thấy người dùng"));
        AssessmentPaper paper = papers.paperForNewSession(assignment, student, attemptNo);
        List<Long> order = SessionPaper.order(papers.paperQuestions(paper.getId()), papers.sections(assignmentId),
                assignment.isShuffleQuestions(), PaperShuffler.of(assignmentId, studentId, attemptNo));
        LocalDateTime endsAt = endsAt(assignment, now);
        AttemptSession session = sessions.saveAndFlush(new AttemptSession(assignment, student, attemptNo, paper, order,
                now, endsAt, accepted ? now : null));
        events.record(session, SessionEventType.started, now, null);
        audit.record(studentId, "session.start", "attempt_session", session.getId(), null, Map.of(
                "assignment_id", assignmentId, "attempt_no", attemptNo, "paper_id", paper.getId(),
                "ends_at", endsAt.toString()));
        return new Started(assembler.view(session, now), true);
    }

    /** `ends_at = min(started_at + time_limit, closes_at)`; không giới hạn giờ → `closes_at` (exam-spec.md §4). */
    static LocalDateTime endsAt(Assignment assignment, LocalDateTime startedAt) {
        LocalDateTime closesAt = assignment.getClosesAt();
        if (assignment.getTimeLimitMinutes() == null) return closesAt;
        LocalDateTime limit = startedAt.plusMinutes(assignment.getTimeLimitMinutes());
        return limit.isBefore(closesAt) ? limit : closesAt;
    }

    /** Khung `[available_from, closes_at)` và còn ít nhất 1 phút trước `closes_at` — exam-spec.md §4. */
    static void requireOpen(Assignment assignment, LocalDateTime now) {
        if (assignment.getAvailableFrom() != null && now.isBefore(assignment.getAvailableFrom()))
            throw notOpen("Chưa đến giờ làm bài", assignment);
        if (!now.isBefore(assignment.getClosesAt().minusMinutes(1)))
            throw notOpen("Đã hết thời gian bắt đầu làm bài", assignment);
    }

    private Started resume(AttemptSession session) {
        LocalDateTime now = now();
        session.touch(now);
        events.record(session, SessionEventType.resumed, now, null);
        return new Started(assembler.view(session, now), false);
    }

    private static LmsException notOpen(String message, Assignment assignment) {
        Map<String, Object> details = new java.util.HashMap<>();
        details.put("available_from", assignment.getAvailableFrom());
        details.put("closes_at", assignment.getClosesAt());
        return new LmsException("EXAM_NOT_OPEN", message, HttpStatus.CONFLICT, details);
    }

    private static LocalDateTime now() { return UtcTime.now().truncatedTo(ChronoUnit.SECONDS); }
}
