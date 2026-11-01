package vn.lmsp.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.QuestionContentDtos.AnswerResponse;
import vn.lmsp.dto.QuestionDtos.QuestionSnapshot;
import vn.lmsp.enums.QuestionType;
import vn.lmsp.enums.SessionEventType;
import vn.lmsp.enums.SubmitReason;
import vn.lmsp.model.*;
import vn.lmsp.repository.*;

/**
 * Nộp phiên và chấm — docs/exam-spec.md §5.6. Chỉ lời gọi giành được `claimSubmit` (đổi đúng 1 dòng) mới tạo lượt,
 * chấm câu khách quan và đẩy bài code vào hàng đợi (outbox `grading_jobs`, priority 10 với kỳ thi).
 */
@Service
@RequiredArgsConstructor
public class SessionSubmitService implements SessionSubmitter {
    static final int EXAM_PRIORITY = 10;
    static final int DEFAULT_PRIORITY = 5;
    private final AttemptSessionRepository sessions;
    private final SessionAnswerRepository answers;
    private final AssignmentAttemptRepository attempts;
    private final SubmissionRepository submissions;
    private final GradingJobRepository jobs;
    private final SessionPaper paper;
    private final QuestionVersionService snapshots;
    private final ObjectiveGrader grader;
    private final SessionEventService events;
    private final AuditService audit;

    @Override
    @Transactional
    public AttemptSession submit(Long sessionId, SubmitReason reason, Long actorId) {
        LocalDateTime now = UtcTime.now().truncatedTo(ChronoUnit.SECONDS);
        if (sessions.claimSubmit(sessionId, reason, now) != 1)
            return sessions.findById(sessionId).orElseThrow(() -> SessionAccess.notFound("Không tìm thấy phiên làm bài"));
        AttemptSession session = sessions.findById(sessionId).orElseThrow();
        AssignmentAttempt attempt = grade(session, now);
        session.markSubmitted(reason, now, attempt);
        events.record(session, eventType(reason), now, null);
        audit.record(actorId, "session.submit", "attempt_session", session.getId(), null, Map.of(
                "reason", reason.name(), "assignment_id", session.getAssignmentId(), "attempt_id", attempt.getId(),
                "score", attempt.getScore()));
        return session;
    }

    /** Scheduler: khóa phiên, chỉ nộp nếu vẫn còn quá hạn (giảng viên có thể vừa gia hạn). */
    @Transactional
    public boolean submitIfDue(Long sessionId, LocalDateTime before) {
        var session = sessions.findForUpdate(sessionId).orElse(null);
        if (session == null || !session.isInProgress() || !session.getEndsAt().isBefore(before)) return false;
        submit(sessionId, SubmitReason.timeout, null);
        return true;
    }

    private AssignmentAttempt grade(AttemptSession session, LocalDateTime now) {
        Assignment assignment = session.getAssignment();
        User student = session.getStudent();
        AssignmentAttempt attempt = attempts.saveAndFlush(new AssignmentAttempt(assignment, student,
                session.getAttemptNo(), false, 0, BigDecimal.ZERO, UUID.randomUUID().toString(), now));
        Map<Long, SessionAnswer> saved = answers.findAllBySession_Id(session.getId()).stream()
                .collect(Collectors.toMap(SessionAnswer::getAssignmentQuestionId, Function.identity(), (left, right) -> left));
        int priority = assignment.isExam() ? EXAM_PRIORITY : DEFAULT_PRIORITY;
        BigDecimal total = BigDecimal.ZERO;
        for (AssignmentQuestion link : paper.questions(session)) {
            SessionAnswer answer = saved.get(link.getId());
            QuestionSnapshot snapshot = snapshots.read(link.getQuestionVersion());
            if (snapshot.type() == QuestionType.programming) {
                if (answer == null || !answer.hasCode()) continue;
                Submission code = submissions.saveAndFlush(Submission.programmingInAttempt(student, assignment, attempt,
                        link, answer.getLanguage(), answer.getSourceCode(), now));
                jobs.save(new GradingJob(code, priority, now));
                continue;
            }
            AnswerResponse response = answer == null ? null : answer.getResponse();
            BigDecimal score = grader.score(link.getPoints(), grader.fraction(snapshot, response), 0);
            submissions.save(new Submission(student, assignment, attempt, link, response, attempt.getAttemptNo(), score,
                    false, null, now));
            total = total.add(score);
        }
        attempt.updateScore(total);
        return attempt;
    }

    private static SessionEventType eventType(SubmitReason reason) {
        return switch (reason) {
            case manual -> SessionEventType.submitted;
            case timeout -> SessionEventType.auto_submitted;
            case forced -> SessionEventType.forced_submitted;
        };
    }
}
