package vn.lmsp.service;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.lmsp.common.LmsException;
import vn.lmsp.common.UtcTime;
import vn.lmsp.dto.GradingDtos.Accepted;
import vn.lmsp.enums.SubmissionType;
import vn.lmsp.mapper.GradingMapper;
import vn.lmsp.model.GradingJob;
import vn.lmsp.repository.GradingJobRepository;
import vn.lmsp.repository.SubmissionRepository;

/**
 * Chấm lại bài code (BR8, docs/assessment-spec.md §5): job mới `attempt_no + 1` qua outbox, submission về `pending`,
 * lịch sử kết quả giữ ở `grading_results`.
 */
@Service
@RequiredArgsConstructor
public class RegradeService {
    private final SubmissionRepository submissions;
    private final GradingJobRepository jobs;
    private final AssignmentAccess access;
    private final GradingMapper mapper;
    private final GradingNotifier notifier;
    private final AuditService audit;

    @Transactional
    public Accepted regrade(Long submissionId, Long actorId, boolean admin, String reason) {
        var submission = submissions.findLockedById(submissionId).orElseThrow(() ->
                new LmsException("NOT_FOUND", "Không tìm thấy bài nộp", HttpStatus.NOT_FOUND, null));
        access.lecturerAssignment(submission.getAssignmentId(), actorId, admin, false);
        if (submission.getType() != SubmissionType.code)
            throw new LmsException("VALIDATION_ERROR", "Chỉ chấm lại được bài nộp code", HttpStatus.BAD_REQUEST, null);
        if (!submission.isTerminal())
            throw new LmsException("CONFLICT", "Bài nộp đang chờ chấm; hãy thử lại sau", HttpStatus.LOCKED, null);
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("status", submission.getStatus().name());
        before.put("verdict", submission.getVerdict() == null ? null : submission.getVerdict().name());
        before.put("score", submission.getScore());
        int next = jobs.findTopBySubmission_IdOrderByAttemptNoDesc(submissionId).map(GradingJob::getAttemptNo).orElse(0) + 1;
        submission.resetForRegrade();
        jobs.save(new GradingJob(submission, 5, next, UtcTime.now()));
        audit.record(actorId, "submission.regrade", "submission", submissionId, before,
                Map.of("status", submission.getStatus().name(), "grading_attempt", next, "reason", reason.strip()));
        notifier.afterCommit(submission, null, false);
        return mapper.toAccepted(submission);
    }
}
