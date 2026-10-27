package vn.lmsp.service;

import java.math.BigDecimal;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.lmsp.model.Submission;
import vn.lmsp.repository.AssignmentAttemptRepository;
import vn.lmsp.repository.SubmissionRepository;

/**
 * Tính lại `attempt.score` = tổng điểm các submission đã có điểm của lượt khi một bài code của lượt chấm xong (kể cả
 * chấm lại) — docs/exam-spec.md §5.6. Gọi trong giao dịch của caller.
 *
 * <p>Thứ tự khóa: lượt trước, submission sau ({@link #lockAttemptOf}), để hai bài code cùng lượt chấm xong đồng thời
 * không ghi đè điểm của nhau và không deadlock.
 */
@Component
@RequiredArgsConstructor
public class AttemptScoreRefresher {
    private final SubmissionRepository submissions;
    private final AssignmentAttemptRepository attempts;

    /** Khóa lượt chứa submission (nếu có) trước khi khóa chính submission. */
    public void lockAttemptOf(Long submissionId) {
        Long attemptId = submissions.findAttemptIdById(submissionId);
        if (attemptId != null) attempts.findForUpdate(attemptId);
    }

    public void refresh(Long attemptId) {
        if (attemptId == null) return;
        attempts.findForUpdate(attemptId).ifPresent(attempt -> attempt.updateScore(
                submissions.findLockedByAttempt(attemptId).stream().map(Submission::getScore)
                        .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add)));
    }
}
