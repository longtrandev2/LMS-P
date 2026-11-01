package vn.lmsp.service;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.dto.AttemptSessionDtos.AttemptSessionSummary;
import vn.lmsp.dto.ReviewDtos.QuizAttemptView;
import vn.lmsp.model.Assignment;
import vn.lmsp.model.AttemptSession;

/** `AttemptSessionSummary` cho giảng viên/admin (gia hạn, thu bài) — docs/api-spec.md §7. Gọi trong giao dịch. */
@Component
@RequiredArgsConstructor
public class SessionAdminSummaryAssembler {
    private final QuizAttemptService quizzes;

    public AttemptSessionSummary summary(AttemptSession session, Assignment assignment, LocalDateTime now) {
        QuizAttemptView attempt = session.getAssignmentAttempt() == null ? null
                : quizzes.attemptView(session.getAssignmentAttempt(), assignment, true);
        return new AttemptSessionSummary(session.getId(), session.getAssignmentId(), session.getAttemptNo(),
                session.getStatus(), session.getPaper().getCode(), session.getStartedAt(), session.getEndsAt(), now,
                session.remainingSeconds(now), session.getSubmittedAt(), session.getSubmitReason(),
                session.getFocusLostCount(), attempt);
    }
}
